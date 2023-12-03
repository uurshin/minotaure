<script>
import { usePlayerStore } from '../main';
import VueMultiselect from "vue-multiselect";

export default {
  components: {
    VueMultiselect
  },
  data() {
    const store = usePlayerStore();
    const pick_multiselect = [];
    const type_pick = 'all'
    const nb_targets = 1;
    const stat_modifier = {};
    const gauge_modifier = {};
    const chosen_modifier_pick_add = [];
    const chosen_modifier_pick_remove = [];

    return {
      store,
      pick_multiselect,
      type_pick,
      nb_targets,
      stat_modifier,
      gauge_modifier,
      chosen_modifier_pick_add,
      chosen_modifier_pick_remove
    }
  },
  mounted() {

  },
  methods: {
    launchPick: function() {
      this.store.resetPickedCharacters();
      this.store.current_game.has_picked = true;

      const vm = this;

      let relevant_characters = this.store.getCharacters(true, this.store.settings.disconnected_prevent, this.store.settings.npc_prevent)

      if (this.pick_multiselect.length) {
        if (this.type_pick === 'one') {
          relevant_characters = relevant_characters.filter(function (character) {
            return character.tags.find(
                (tag) => vm.pick_multiselect.find((chosen_tag) => chosen_tag.code === tag.code)
            )
          });
        }
        else if (this.type_pick === 'all') {
          relevant_characters = relevant_characters.filter(
              function (character) {
                let found = 0;
                vm.pick_multiselect.every(function(tag) {
                  found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
                  return (found > -1);
                })
                return (found > -1);
              }
          );
        }
        else if (this.type_pick === 'none') {
          relevant_characters = relevant_characters.filter(
              function (character) {
                let found = -1;
                vm.pick_multiselect.every(function(tag) {
                  found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
                  return (found === -1);
                })
                return (found === -1);
              }
          );
        }
        else if (this.type_pick === 'each') {
          // TODO : each
          // vm.pick_multiselect.forEach(function(picked_tag) {
          //   let chosen_characters = relevant_characters.filter(function (character) {
          //     return character.tags.find((tag) => tag.code === picked_tag.code);
          //   });
          //   let picked_characters = this.store.getRandom(relevant_characters, this.nb_targets);
          // })
        }
      }

      if (relevant_characters.length) {
        let picked_characters = this.store.getRandom(relevant_characters, this.nb_targets);
        this.store.setPickedCharacters(picked_characters);

        picked_characters.forEach(function(character) {
          character.in_progress = true;
          let messages = [];
          // messages.push(vm.$t('challenge_' + result, {stat: vm.store.current_game.stats[vm.chosen_stat].name}));

          if (vm.gauge_modifier !== undefined) {
            for (const [key, bonus] of Object.entries(vm.gauge_modifier)) {
              // messages.push(vm.$t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.store.current_game.gauges[key].name}));
              character.gauges[key].value += bonus;
            }
          }
          if (vm.stat_modifier !== undefined) {
            for (const [key, bonus] of Object.entries(vm.stat_modifier)) {
              // messages.push(vm.$t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.store.current_game.stats[key].name}));
              character.stats[key].value += bonus;
            }
          }
          if (vm.chosen_modifier_pick_add !== undefined) {
            vm.chosen_modifier_pick_add.forEach(function(tag) {
              let found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
              if (found === -1) {
                character.tags.push(tag);
                // messages.push(vm.$t('added_tag', {tag_label: tag.label}) );
              }
            });
          }
          if (vm.chosen_modifier_pick_remove !== undefined) {
            vm.chosen_modifier_pick_remove.forEach(function(tag) {
              let found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
              if (found !== -1) {
                character.tags.splice(found, 1);
                // messages.push(vm.$t('removed_tag', {tag_label: tag.label}) );
              }
            });
          }

          delete character.in_progress;
        })
      }

      this.nb_targets = 1;
      this.stat_modifier = {};
      this.gauge_modifier = {};
      this.pick_multiselect = [];
      this.chosen_modifier_pick_add = [];
      this.chosen_modifier_pick_remove = [];

      this.$parent.changeTab('characters');
    },
    modifierChange(name, key, value) {
      if (this[name + '_modifier'][key] === undefined) {
        this[name + '_modifier'][key] = value;
      }
      else {
        this[name + '_modifier'][key] += value
      }
      if (this[name + '_modifier'][key] === 0) {
        delete this[name + '_modifier'][key];
      }
    },
    addTag(tag_label, type) {
      let group = this.store.tag_groups.find((element) => (element.code === 'freetag'));
      if (group === undefined) {
        group = this.store.addGroupTag(true);
      }
      let tag = this.store.addTag(tag_label, group);
      group.picking_array.push(tag.code);
      this.chosen_modifier_pick_add.push(tag);
    },
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-pick-content'>
      <div class="vertical-wrapper">
        <input ref="step_pick_1" type="number" v-model="nb_targets" min="1">
        <select v-model="type_pick">
          <option value="one">{{ $t('admin_pick_one') }}</option>
          <option value="all">{{ $t('admin_pick_all') }}</option>
          <option value="none">{{ $t('admin_pick_none') }}</option>
          <option disabled value="each">{{ $t('admin_pick_each') }} - {{ $t('future_feature') }}</option>
        </select>
        <vue-multiselect
            ref="pick_multiselect"
            id="pick_multiselect"
            v-model="pick_multiselect"
            label="label"
            track-by="code"
            group-values="tags"
            group-label="label"
            :group-select="true"
            :placeholder="$t('select_tag')"
            :tagPlaceholder="$t('select_tag')"
            :showNoOptions="false"
            :options=store.tag_groups
            :multiple="true"
            :taggable="false"
            :hideSelected="true"
        ></vue-multiselect>
      </div>

      <div id="consequences" class="vertical-wrapper">
        <span class="label-wrapper">{{ $t('admin_pick_add_csq') }}</span>
        <div>
          <div class="modifiers-buttons" v-for="(gauge, key) in store.current_game.gauges">
            <span class="modifier-label">{{ gauge.name }}</span>
            <div>
              <button @click="modifierChange('gauge', key,  -1)">-</button>
              <span class="modifier-value">{{ gauge_modifier[key] !== undefined ? (gauge_modifier[key] >= 0 ? "+" : '') + gauge_modifier[key] : "+0" }}</span>
              <button @click="modifierChange('gauge', key, +1)">+</button>
            </div>
          </div>
          <div class="modifiers-buttons" v-for="(stat, key) in store.current_game.stats">
            <span class="modifier-label">{{ stat.name }}</span>
            <div>
              <button @click="modifierChange('stat', key, -1)">-</button>
              <span class="modifier-value">{{ stat_modifier[key] !== undefined ? (stat_modifier[key] >= 0 ? "+" : '') + stat_modifier[key] : "+0" }}</span>
              <button @click="modifierChange('stat', key, +1)">+</button>
            </div>
          </div>
        </div>
        <div class="full">
          <label for='chosen_modifier_pick_add'>{{ $t('add_tags') }}</label>
          <vue-multiselect
              id='chosen_modifier_pick_add'
              v-model="chosen_modifier_pick_add"
              label="label"
              track-by="code"
              :tag-placeholder="$t('add_tag')"
              :placeholder="$t('input_word')"
              :showNoOptions="false"
              group-values="tags"
              group-label="label"
              :group-select="false"
              :options=store.tag_groups
              :multiple="true"
              :taggable="true"
              :hideSelected="true"
              @tag="addTag($event)"
          ></vue-multiselect>
        </div>
        <div class="full">
          <label for='chosen_modifier_pick_remove'>{{ $t('remove_tag') }}</label>
          <vue-multiselect
              id='chosen_modifier_pick_remove'
              v-model="chosen_modifier_pick_remove"
              label="label"
              track-by="code"
              :placeholder="$t('input_word')"
              :showNoOptions="false"
              group-values="tags"
              group-label="label"
              :group-select="false"
              :options=store.tag_groups
              :multiple="true"
              :hideSelected="true"
              @tag="addTag($event)"
          ></vue-multiselect>
        </div>
      </div>

      <button id="admin_pick_button" class="btn-valid" @click="launchPick">{{ $t('admin_pick_launch') }}</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  #tab-pick-content {
    input[type="number"] {
      width: 60px;
      height: 60px;
      border-radius: 100%;
      text-align: center;
      background: white;
      color: black;
      font-size: 1.1em;
    }

    > div {
      flex: 1;
      flex-wrap: wrap;
      justify-content: flex-start;
      text-align: left;
      background: var(--background-card-color);
      padding: 15px;
      border-radius: 15px;
      gap: 15px;

      .label-wrapper {
        flex-basis: 100%;
        font-weight: bold;
      }

      .modifiers {
        display: flex;
        align-items: center;
        gap: 30px;

        > .modifiers-buttons {
          text-align: center;
        }
      }
    }
  }
  #admin_pick_button {
    align-self: flex-start;
  }
  .vertical-wrapper {
    flex-direction: row;
  }
  .multiselect {
    width: auto;
  }

  #consequences {
    > div {
      &.full {
        flex-basis: 100%;
      }
      display: flex;
      align-items: center;
      gap: 30px;

      > div.modifiers-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        gap: 10px;
        flex-wrap: wrap;

        > div {
          display: flex;
          gap: 10px;
          align-items: center;

          > .modifier-value {
            flex: 1;
          }
          > button {
            text-align: center;
            display: inline-block;
            border-radius: 100%;
            width: 30px;
            height: 30px;
            padding: 0;
            flex: 1;
          }
        }

        > .modifier-label {
          flex-basis: 100%;
          text-align: center;
        }
      }
    }
  }
</style>