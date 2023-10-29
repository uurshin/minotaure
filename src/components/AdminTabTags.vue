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
    const store = usePlayerStore();
    const options_contextual = [{}];
    const color = reactive({
      hue: 50,
      saturation: 71,
      luminosity: 50,
      alpha: 1,
    });
    const color_picked = null;
    const group_selected = null;

    return {
      store,
      options_contextual,
      color,
      color_picked,
      group_selected
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
      if (this.color_picked != null) {
        this.color_picked.color = [hue,71,50];
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
      if (tagIndex > -1) {
        this.store.tag_groups[groupIndex].tags.splice(tagIndex, 1);
        this.store.tag_groups[groupIndex].picking_array = this.store.tag_groups[groupIndex].picking_array.filter((code) => code !== tag.code);
      }
      this.store.generateCss();
    },
    addGroupTag: function() {
      let group = {
        tags: [],
        picking_array: [],
        start: 'random',
        code: Math.floor((Math.random() * 10000000)),
        label: this.$t('group_nb', {nb: this.store.tag_groups.length + 1})
      }
      this.store.tag_groups.push(group);
      this.$nextTick(() => {
        this.$refs['group_tag_select_' + group.code][0].$el.focus()
      });
    },
    removeGroupTag: function(key) {
      this.store.tag_groups[key].tags.forEach((tag) => this.store.removeTagFromAll(tag));
      this.store.tag_groups.splice(key, 1);
      this.store.generateCss();
    },
    allocateGroupTag: function(group) {
      const vm = this;
      this.store.characters.forEach(function(character) {
        // Check if the character already has a tag from this group.
        let found = character.tags.findIndex((tag) => tag.group === group.code);
        if (found === -1) {
          character.tags.push(vm.store.getRandomTagFromGroup(group));
        }
      })
    },
    focusLabelGroup(event, key) {
      this.group_selected = key;
      this.$nextTick(() => {
        this.$refs['group_name_input_' + key][0].focus();
      });
    },
    handleClick (event, item) {
      this.options_contextual = this.generateOptions(item)
      this.$refs.context_menu_tags.showMenu(event, item)
      this.$refs.context_menu_tags.$el.focus();
    },
    generateOptions (item) {
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

      if (item.probability !== undefined && item.probability > 1) {
        options.push({name: this.$t('substract_probability'), effect:'substract_probability'});
      }
      options.push({name: this.$t('add_probability'), effect:'add_probability'});

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
          case 'add_probability':
            if (tag.probability === undefined) {
              tag.probability = 2;
            }
            else {
              tag.probability += 1;
            }
            break;
          case 'substract_probability':
            tag.probability -= 1;
            break;
        }
      }
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id="tab-tags-content">
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
        <button class="icon-add" @click="addGroupTag()">{{ $t("add_groug_of_tag") }}</button>
      </div>
      <template v-for="(group, key) in store.current_game.tag_groups">
        <div class="group-tag">
          <span class="group-label">
            <input :ref="'group_name_input_'+ key" @keydown.enter="group_selected = null;" v-if="group_selected === key" type="text" v-model="store.current_game.tag_groups[key].label" />
            <button v-show="group_selected !== key" @keyup.enter="focusLabelGroup($event, key)" @click="focusLabelGroup($event, key)" class="icon-edit">{{ store.current_game.tag_groups[key].label }}</button>
            <button v-show="group_selected === key" @click="group_selected = null">{{ $t("tags_submit") }}</button>
          </span>
          <div class="actions secondary">
            <label for="creation_rule">{{ $t("distribution_mode") }}</label>
            <select id="creation_rule" v-model="store.current_game.tag_groups[key].start">
              <option value="random">{{ $t("randomly_distributed_at_creation") }}</option>
              <option value="balanced">{{ $t("equaly_distributed_at_creation") }}</option>
              <option value="start">{{ $t("chosen_at_char_creation") }}</option>
              <option value="none">{{ $t("not_autodistributed") }}</option>
            </select>
            <button @click="allocateGroupTag(group)" :title="$t('a_tag_will_be_assigned_to_char')">{{ $t("reallocate") }}</button>
            <button class="btn-danger" @click="removeGroupTag(key)" :title="$t('delete_groupe_tags_and_remove_from_chars')">{{ $t("delete") }}</button>
          </div>
          <span v-for="code in group.picking_array">{{ code }},</span>
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
                    tabindex="0" @keyup.enter="handleClick($event, tag.option)" @click.prevent.stop="handleClick($event, tag.option)" title="Paramétrer ce tag"
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
                    <span>{{ tag.option.probability ?? 1 }} chance sur {{ store.current_game.tag_groups[key].picking_array.length }}</span>
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