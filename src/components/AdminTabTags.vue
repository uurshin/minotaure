<script>
import { usePlayerStore } from '../main';
import { reactive } from 'vue'
import VueMultiselect from 'vue-multiselect'
import VueSimpleContextMenu from 'vue-simple-context-menu';
import 'vue-simple-context-menu/dist/vue-simple-context-menu.css';
import '@radial-color-picker/vue-color-picker/dist/vue-color-picker.min.css';
import ColorPicker from '@radial-color-picker/vue-color-picker';

export default {
  components: { VueMultiselect, VueSimpleContextMenu, ColorPicker },
  data() {
    return {
      store: usePlayerStore(),
      options_contextual: [{}],
      color: reactive({
        hue: 50,
        saturation: 71,
        luminosity: 50,
        alpha: 1,
      }),
      color_picked: null,
      group_selected: null,
      coloring: false,
    }
  },
  mounted() {
    this.store.generateCss();
  },
  methods: {
    onInput(hue) {
      this.color.hue = hue;
    },
    onColorSelect(hue) {
      const vm = this;
      if (vm.color_picked != null) {
        vm.color_picked.color = [hue,71,50];

        vm.store.characters.forEach(function(character) {
          character.tags.forEach(function(tag) {
            if (tag.code === vm.color_picked.code) {
              tag.color = vm.color_picked.color;
            }
          });
        })

        this.store.generateCss();
      }
    },
    handleFocusOut() {
      this.color_picked = null;
    },
    removeTag: function(tag) {
      this.store.removeTagFromAll(tag);
      let groupIndex = this.store.tag_groups.findIndex((group) => group.code === tag.group);
      let tagIndex = this.store.tag_groups[groupIndex].tags.findIndex((search_tag) => search_tag.code === tag.code);
      this.store.tag_groups[groupIndex].picking_array = this.store.tag_groups[groupIndex].picking_array.filter((code) => code !== tag.code);
      if (tagIndex > -1) {
        this.store.tag_groups[groupIndex].tags.splice(tagIndex, 1);
      }
      this.store.generateCss();
    },
    addGroupTag: function() {
      let group = this.store.addGroupTag();
      this.$nextTick(() => {
        this.$refs['group_tag_select_' + group.code][0].$el.focus()
      });
    },
    removeGroupTag: function(key) {
      this.store.tag_groups[key].tags.forEach((tag) => this.store.removeTagFromAll(tag));
      this.store.tag_groups.splice(key, 1);
      this.store.generateCss();
    },
    distributeGroupTag: function(group) {
      const vm = this;
      if (group.tags.length) {
        this.store.characters.forEach(function(character) {
          // Check if the character already has a tag from this group.
          let found = character.tags.findIndex((tag) => tag.group === group.code);
          if (found === -1) {
            vm.store.addTagToCharacter(character, vm.store.getRandomTagFromGroup(group));
          }
        })
      }
    },
    shuffleGroupTag: function(group) {
      const vm = this;
      this.store.characters.forEach(function(character) {
        // Check if the character already has a tag from this group.
        let found_tag = character.tags.find((tag) => tag.group === group.code);
        if (found_tag !== null) {
          if (vm.store.removeTagFromCharacter(character, found_tag, true)) {
            vm.store.addTagToCharacter(character, vm.store.getRandomTagFromGroup(group));
          }
        }
      })
    },
    uncolorAll: function() {
      const vm = this;
      this.coloring = false;
      this.store.characters.forEach(function(character) {
        delete character.color;
      })
    },
    colorGroupTag: function(group) {
      const vm = this;
      this.coloring = true;
      this.store.characters.forEach(function(character) {
        // Check if the character already has a tag from this group.
        let found_tag = character.tags.find((tag) => tag.group === group.code);
        if (found_tag !== undefined) {
          character.color = vm.hslToRgb(found_tag.color[0], found_tag.color[1], found_tag.color[2]);
        }
        else {
          delete character.color;
        }
      })
    },
    hslToRgb(h, s, l) {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color);   // convert to Hex and prefix "0" if needed
      };
      return [`${f(0)}`, `${f(8)}`, `${f(4)}`];
    },
    focusLabelGroup(event, key) {
      this.group_selected = key;
      this.$nextTick(() => {
        this.$refs['group_name_input_' + key][0].focus();
      });
    },
    handleClick (event, item, group) {
      this.options_contextual = this.generateOptions(item, group)
      this.$refs.context_menu_tags.showMenu(event, item)
      this.$refs.context_menu_tags.$el.focus();
    },
    generateOptions (item, group) {
      let options = [];

      options.push({name: this.$t('delete'), effect:'remove'});
      options.push({ type:'divider'})

      if (item.stat1 === undefined) {
        for (const [key, stat] of Object.entries(this.store.stats)) {
          options.push({name: this.$t('linkStatToTag', {statname: stat.name}), effect:'stat1', target: key });
        }
      }
      else {
        options.push({name: this.$t('unlinkStatToTag', {statname: this.store.stats[item.stat1].name}), effect:'stat1_unset', target: item.stat1 });
      }

      if (item.stat1 !== undefined) {
        if (item.stat2 === undefined) {
          for (const [key, stat] of Object.entries(this.store.stats)) {
            if (item.stat1 !== key) {
              options.push({name: this.$t('link2StatToTag', {statname: stat.name}), effect:'stat2', target: key });
            }
          }
        }
        else {
          options.push({name: this.$t('unlink2StatToTag', {statname: this.store.stats[item.stat2].name}), effect:'stat2_unset', target: item.stat2 });
        }
      }
      options.push({ type:'divider'})

      for (const [key, gauge] of Object.entries(this.store.gauges)) {
        options.push({name: this.$t('bonus_gauge', {name : gauge.name}), effect:'bonus_gauge', target: key, value: 1 });
        options.push({name: this.$t('malus_gauge', {name : gauge.name}), effect:'bonus_gauge', target: key, value: -1 });
      }
      options.push({ type:'divider'})

      for (const [key, stat] of Object.entries(this.store.stats)) {
        options.push({name: this.$t('bonus_stat', {name : stat.name}), effect:'bonus_stat', target: key, value: 1 });
        options.push({name: this.$t('malus_stat', {name : stat.name}), effect:'bonus_stat', target: key, value: -1 });
      }
      options.push({ type:'divider'})

      options.push({name: this.$t('change_tag_color'), effect:'color'});

      if (group.start === 'random') {
        if (item.probability !== undefined && item.probability > 1) {
          options.push({name: this.$t('decrease_probability'), effect:'decrease_probability', group: group});
        }
        options.push({name: this.$t('increase_probability'), effect:'increase_probability', group: group});
      }

      return options;
    },
    optionClicked (event) {
      if (event.option.effect !== undefined) {
        let tag = this.store.getTagFromCode(event.item.code);
        switch (event.option.effect) {
          case 'remove':
            this.removeTag(event.item);
            break;
          case 'bonus_stat':
            if (tag.stat_modifiers === undefined) {
              tag.stat_modifiers = {};
            }
            if (tag.stat_modifiers[event.option.target]  === undefined) {
              tag.stat_modifiers[event.option.target] = {value: event.option.value};
            }
            else {
              tag.stat_modifiers[event.option.target].value += event.option.value;
            }
            if (tag.stat_modifiers[event.option.target].value === 0) {
              delete tag.stat_modifiers[event.option.target];
            }
            this.store.updateStatModifier(tag);
            break;
          case 'bonus_gauge':
            if (tag.gauge_modifiers === undefined) {
              tag.gauge_modifiers = {};
            }
            if (tag.gauge_modifiers[event.option.target]  === undefined) {
              tag.gauge_modifiers[event.option.target] = {value: event.option.value};
            }
            else {
              tag.gauge_modifiers[event.option.target].value += event.option.value;
            }
            if (tag.gauge_modifiers[event.option.target].value === 0) {
              delete tag.gauge_modifiers[event.option.target];
            }
            this.store.updateGaugeModifier(tag, event.option.target, event.option.value);
            break;
          case 'stat1':
            tag.stat1 = event.option.target;
            break;
          case 'stat1_unset':
            if (tag.stat2 !== undefined) {
              tag.stat1 = tag.stat2;
              delete tag.stat2;
            }
            else {
              delete tag.stat1;
            }
            break;
          case 'stat2':
            tag.stat2 = event.option.target;
            break;
          case 'stat2_unset':
            delete tag.stat2;
            break;
          case 'color':
            this.color.hue = tag.color[0];
            this.color_picked = tag;
            this.$nextTick(() => {
              this.$refs.color_picker.$el.focus()
            });
            break;
          case 'increase_probability':
            if (tag.probability === undefined) {
              tag.probability = 2;
            }
            else {
              tag.probability += 1;
            }
            event.option.group.picking_array.push(tag.code);
            break;
          case 'decrease_probability':
            tag.probability -= 1;
            let index = event.option.group.picking_array.findIndex((code) => code === tag.code);
            if (index > -1) {
              event.option.group.picking_array.splice(index, 1);
            }
            break;
        }
      }
    },
    changeGroupRule(group) {
      if (group.start === 'equitable') {
        group.picking_array = [];
        group.tags.forEach((tag) => group.picking_array.push(tag.code));
      }
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id="tab-tags-content" ref="step_tags">
      <div class="actions">
        <VueSimpleContextMenu
            element-id="context_menu_tags"
            :options="options_contextual"
            ref="context_menu_tags"
            @option-clicked="optionClicked"
        />
        <div class="color-picker" :class="{show: color_picked != null}">
          <color-picker
              ref="color_picker"
              v-bind="color"
              @input="onColorSelect"
              @focusout="handleFocusOut"
              :step="30"
          >
          </color-picker>
        </div>
        <button ref="step_tags_group_add" class="icon-add" @click="addGroupTag()">{{ $t("add_groug_of_tag") }}</button>
      </div>
      <template v-for="(group, key) in store.getGroupTags()">
        <div class="group-tag" :ref="key === 0 ? 'step_tags_group' : null">
          <span class="group-label">
            <input :ref="'group_name_input_'+ key" @keyup.enter="group_selected = null;" v-if="group_selected === key" type="text" v-model="store.current_game.tag_groups[key].label"/>
            <button
                v-show="group_selected !== key"
                @keyup.enter="focusLabelGroup($event, key)"
                @click="focusLabelGroup($event, key)"
                class="icon-edit"
                :ref="key === 0 ? 'step_tags_group_rename' : null"
            >
              {{ store.current_game.tag_groups[key].label }}
            </button>
            <button v-show="group_selected === key" @click="group_selected = null">{{ $t("tags_submit") }}</button>
          </span>
          <div class="actions secondary">
            <label for="creation_rule">{{ $t("distribution_mode") }}</label>
            <select @change="changeGroupRule(group)" id="creation_rule" v-model="store.current_game.tag_groups[key].start" :ref="key === 0 ? 'step_tags_group_distribution' : null">
              <option value="random">{{ $t("randomly_distributed_at_creation") }}</option>
              <option value="equitable">{{ $t("equitably_distributed_at_creation") }}</option>
              <option value="start">{{ $t("chosen_at_char_creation") }}</option>
              <option value="none">{{ $t("not_autodistributed") }}</option>
            </select>
            <button @click="distributeGroupTag(group)" :title="$t('a_tag_will_be_assigned_to_char')" :ref="key === 0 ? 'step_tags_group_distribute' : null">{{ $t("distribute") }}</button>
            <button @click="shuffleGroupTag(group)" :title="$t('shuffle_help')" :ref="key === 0 ? 'step_tags_group_shuffle' : null">{{ $t("shuffle") }}</button>

            <button v-if="!coloring" @click="colorGroupTag(group)">Colorer</button>
            <button v-else @click="uncolorAll()">Décolorer</button>

            <button class="btn-danger" @click="removeGroupTag(key)" :title="$t('delete_groupe_tags_and_remove_from_chars')" :ref="key === 0 ? 'step_tags_group_delete' : null">{{ $t("delete") }}</button>
          </div>

          <vue-multiselect
              :ref="'group_tag_select_' + group.code"
              :id="'tag_'+key"
              v-model="store.current_game.tag_groups[key].tags"
              label="label"
              track-by="code"
              :tag-placeholder="$t('add_tag')"
              :placeholder="$t('input_word')"
              :closeOnSelect="false"
              :showNoOptions="false"
              :options="store.current_game.tag_groups[key].tags"
              :multiple="true"
              :taggable="true"
              :hideSelected="true"
              :show-no-results="false"
              @tag="store.addTag($event, group)"
              @remove="removeTag($event)"
          >
            <template #tag="tag" >
                <div
                    class="multiselect__tag"
                    :class="'tag tag-' + tag.option.code"
                    tabindex="0" @keyup.enter="handleClick($event, tag.option, group)" @click.prevent.stop="handleClick($event, tag.option, group)" title="Paramétrer ce tag"
                    :ref="key === 0 && Object.entries(group.tags)[0].code === tag.code ? 'step_tags_tag' : null"
                    >
                  <div>
                    <span class="icon-settings hover-only"></span>
                    <span class="label-name">{{ tag.option.label }}</span>
                    <span v-if="tag.option.stat1">{{ tag.option.stat1 !== undefined ? $t('main_stat') + store.stats[tag.option.stat1].name : '' }}</span>
                    <span v-if="tag.option.stat2">{{ tag.option.stat2 !== undefined ? $t('secondary_stat') + store.stats[tag.option.stat2].name : '' }}</span>
                    <span v-if="tag.option.gauge_modifiers !== undefined" v-for="(modifier, key) in tag.option.gauge_modifiers">
                      {{ store.gauges[key].name }} {{ modifier.value > 0 ? '+' + modifier.value : modifier.value }}
                    </span>
                    <span v-if="tag.option.stat_modifiers !== undefined" v-for="(modifier, key) in tag.option.stat_modifiers">
                      {{ store.stats[key].name }} {{ modifier.value > 0 ? '+' + modifier.value : modifier.value }}
                    </span>
                    <span v-if="group.start === 'random'">{{ $t('tag_probability', {count: (tag.option.probability ?? 1), total: store.current_game.tag_groups[key].picking_array.length }) }}</span>
                  </div>
                </div>
            </template>
          </vue-multiselect>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss">
  .group-tag {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    background: var(--background-card-color);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 10px 15px;

    button {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .group-label {
      display: flex;
      gap: 10px;
    }

    .actions {
      flex: 0;
      margin-left: auto;

      > label {
        white-space: nowrap;
      }
    }

    > label:first-child {
      align-self: center;
    }
    > button {
      margin-left: auto;
      align-self: center;
    }

    > label {
      align-items: center;
      display: flex;
      gap: 5px;
    }

    .multiselect {
      flex: 1 0 100%;

      .multiselect__input {
        position: relative !important;
        border: none;
        right: unset;
        top: unset;
        text-align: left;
      }

      .multiselect__tags {
        border-radius: 5px;
      }

      .multiselect__tags-wrap {
        .multiselect__tag {
          padding: 6px 10px;
          align-items: flex-start;
          display: flex;
          gap: 3px;

          button {
            align-self: baseline;
            padding: 0;
            color: var(--font-color);
          }

          > div {
            display: flex;
            flex-direction: column;

            .label-name {
              font-size: 1.2em;
              font-weight: bold;
              display: flex;
              align-items: center;
              gap: 3px;

              &:before {
                display: block;
                content: "";
                width: 20px;
                height: 20px;
                border-radius:100%;
              }
            }

            .hover-only {
              opacity: 0;
              position: absolute;
              display: none;
            }
          }

          &:hover {
            cursor: pointer;

            .label-name {
              &:before {
                opacity: 0;
              }
            }

            span.hover-only {
              opacity: 1;
              display: block;
            }
          }
        }
      }
    }
  }

  .color-picker {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    display: none;
    opacity: 0;

    background: rgba(0,0,0, 0.7);
    z-index: 10000;
    transition: all 0.3s ease-in-out;

    &.show {
      display: flex;
      opacity: 1;
    }

    > .rcp {
      margin: auto;
      z-index: 1000;
    }
  }
</style>