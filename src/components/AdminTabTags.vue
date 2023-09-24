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
    const basic_colors = [
        345, 128, 52, 227, 25, 286
    ];
    const current_basic_color = 0;
    const color = reactive({
      hue: 50,
      saturation: 71,
      luminosity: 50,
      alpha: 1,
    });
    const color_picked = null;

    return {
      store,
      options_contextual,
      color,
      color_picked,
      basic_colors,
      current_basic_color
    }
  },
  mounted() {
    this.generateCss();
  },
  methods: {
    onInput(hue) {
      this.color.hue = hue;
    },
    onColorSelect(hue) {
      if (this.color_picked != null) {
        this.color_picked.color = [hue,71,50];
        this.generateCss();
      }
    },
    handleFocusOut() {
      this.color_picked = null;
    },
    addTag: function(tag_label, group) {
      const tag = {
        label: tag_label,
        code: tag_label.substring(0, 2) + Math.floor((Math.random() * 10000000)),
        color: [this.basic_colors[this.current_basic_color],71,50],
        group: group.code
      }
      this.current_basic_color = (this.current_basic_color === this.basic_colors.length ? 0 : this.current_basic_color + 1);
      // Todo recherche si code déjà existant.
      group.tags.push(tag);
      this.generateCss();
    },
    generateCss() {
      let game_css = document.getElementById('game_css');
      let css_str = '';
      this.store.tags.forEach((tag) => css_str += '.tag-' + tag.code + ' .label-name:before { background-color:hsl(' + tag.color[0] + ',' + tag.color[1] + '%' + ',' + tag.color[2] + '%)' + ' !important} ');
      game_css.innerHTML = css_str;
    },
    removeTag: function(tag) {
      this.store.removeTagFromAll(tag);
      this.generateCss();
    },
    addGroupTag: function() {
      let group = {
        tags: [],
        start: 'random',
        code: Math.floor((Math.random() * 10000000))
      }
      this.store.tag_groups.push(group);
      this.$nextTick(() => {
        this.$refs['group_tag_select_' + group.code][0].$el.focus()
      });
    },
    removeGroupTag: function(key) {
      this.store.tag_groups[key].tags.forEach((tag) => this.removeTag(tag));
      this.store.tag_groups.splice(key, 1);
      this.generateCss();
    },
    allocateGroupTag: function(group) {
      let store = this.store;
      this.store.characters.forEach(function(character) {
        let found = character.tags.findIndex((tag) => tag.group === group.code);
        if (found === -1) {
          character.tags.push(group.tags[Math.floor(Math.random() * group.tags.length)]);
        }
      })
    },
    handleClick (event, item) {
      this.options_contextual = this.generateOptions(item)
      this.$refs.context_menu_tags.showMenu(event, item)
      this.$refs.context_menu_tags.$el.focus();
    },
    generateOptions (item) {
      let options = [];
      for (const [key, stat] of Object.entries(this.store.stats)) {
        options.push({name: 'Augmenter ' + stat.name, effect:'bonus', target: key, value: 1 });
      }
      options.push({ type:'divider'})

      for (const [key, stat] of Object.entries(this.store.stats)) {
        options.push({name: 'Diminuer ' + stat.name, effect:'bonus', target: key, value: -1 });
      }
      options.push({ type:'divider'})

      if (item.stat1 === undefined) {
        for (const [key, stat] of Object.entries(this.store.stats)) {
          options.push({name: 'Associer à ' + stat.name + ' comme carac principale', effect:'stat1', target: key });
        }
        options.push({ type:'divider'})
      }
      else {
        options.push({name: 'Ne plus associer ' + this.store.stats[item.stat1].name + ' comme carac principale', effect:'stat1_unset', target: item.stat1 });
      }

      if (item.stat1 !== undefined) {
        if (item.stat2 === undefined) {
          for (const [key, stat] of Object.entries(this.store.stats)) {
            if (item.stat1 !== key) {
              options.push({name: 'Associer à ' + stat.name + ' comme carac secondaire', effect:'stat2', target: key });
            }
          }
        }
        else {
          options.push({name: 'Ne plus associer à ' + this.store.stats[item.stat2].name + ' comme carac secondaire', effect:'stat2_unset', target: item.stat2 });
        }
      }

      options.push({name: 'Changer la couleur', effect:'color'});

      return options;
    },
    optionClicked (event) {
      if (event.option.effect !== undefined) {
        let tag = this.store.getTagFromCode(event.item.code);
        switch (event.option.effect) {
          case 'bonus':
            if (tag.modifiers === undefined) {
              tag.modifiers = {};
            }
            if (tag.modifiers[event.option.target]  === undefined) {
              tag.modifiers[event.option.target] = {value: event.option.value};
            }
            else {
              tag.modifiers[event.option.target].value += event.option.value;
            }
            if (tag.modifiers[event.option.target].value === 0) {
              delete tag.modifiers[event.option.target];
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
        }
      }
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
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

    <div id="id='tab-tags-content">
      <div class="actions">
        <button class="icon-add" @click="addGroupTag()">Ajouter un groupe de tags</button>
        <span>Clic droit sur un tag pour modifier ses caractéristiques</span>
      </div>
      <template v-for="(group, key) in store.current_game.tag_groups">
        <div class="group-tag">
          <span v-if="group.freetag !== undefined">Groupe des tags créés depuis les épreuves</span>
          <vue-multiselect
              :ref="'group_tag_select_' + group.code"
              :id="'tag_'+key"
              v-model="store.current_game.tag_groups[key].tags"
              label="label"
              track-by="code"
              tag-placeholder="Ajouter un tag"
              placeholder="Tapez un mot"
              :closeOnSelect="false"
              :showNoOptions="false"
              :options="store.current_game.tag_groups[key].tags"
              :multiple="true"
              :taggable="true"
              :hideSelected="true"
              :show-no-results="false"
              @tag="addTag($event, group)"
              @remove="removeTag($event)"
          >
            <template #tag="tag" >
                <div
                    class="multiselect__tag"
                    :class="'tag tag-' + tag.option.code"
                    >
                  <div tabindex="0" @keyup.enter="handleClick($event, tag.option)" @click.prevent.stop="handleClick($event, tag.option)" title="Paramétrer ce tag">
                    <span class="icon-settings hover-only"></span>
                    <span class="label-name">{{ tag.option.label }}</span>
                    <span v-if="tag.option.stat1">{{ tag.option.stat1 !== undefined ? ' Carac principale :  ' + store.stats[tag.option.stat1].name : '' }}</span>
                    <span v-if="tag.option.stat2">{{ tag.option.stat2 !== undefined ? ' Carac secondaire : ' + store.stats[tag.option.stat2].name : '' }}</span>
                    <span v-if="tag.option.modifiers !== undefined" v-for="(modifier, key) in tag.option.modifiers">
                      {{ store.stats[key].name }} {{ modifier.value > 0 ? '+' + modifier.value : modifier.value }}
                    </span>
                  </div>
                  <i tabindex="0" class="multiselect__tag-icon" @click="tag.remove(tag.option)" @keyup.enter="tag.remove(tag.option)"></i>
                </div>
            </template>
          </vue-multiselect>
          <div class="actions secondary">
            <label for="creation_rule">Règle d'attribution</label>
            <select id="creation_rule" v-model="store.current_game.tag_groups[key].start">
              <option value="random">Répartis aléatoirement à la création</option>
              <option value="start">A choisir à la création du personnage</option>
              <option value="none">Pas de règle</option>
            </select>
            <button @click="allocateGroupTag(group)" title="Pour chaque personnage n'ayant pas encore de tag de ce groupe, un tag lui sera attribué au hasard">Redistribuer</button>
            <button class="btn-danger" @click="removeGroupTag(key)" title="Tous les tags de ce groupe seront supprimés, et retirés des personnages.">Supprimer</button>
          </div>
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
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 10px 15px;

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
      flex: 1;

      .multiselect__tags-wrap {
        .multiselect__tag {
          padding: 6px 10px;
          align-items: flex-start;
          display: flex;
          gap: 3px;

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

            &:hover {
              cursor: pointer;
              > span {
                opacity: 0;
              }

              > span.hover-only {
                opacity: 1;
                display: block;
              }
            }
          }
        }
      }
    }
  }

  .multiselect__tag-icon {
    width: auto;
    &:after {
      font-size: 2em;
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