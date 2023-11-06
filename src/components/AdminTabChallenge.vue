<script>
import router, { usePlayerStore } from '../main';
import VueMultiselect from 'vue-multiselect'
import Slider from "@vueform/slider"

export default {
  components: { VueMultiselect, Slider },
  data() {
    const store = usePlayerStore();
    const types = ['success', 'failure'];
    const chosen_stat = '';
    const chosen_tags = [];
    const stat_modifier = {'success': {}, 'failure': {}};
    const gauge_modifier = {'success': {}, 'failure': {}};
    const chosen_modifier_tags_add = {'success': [], 'failure': []};
    const chosen_modifier_tags_remove = {'success': [], 'failure': []};
    const challenge_difficulty = 0;

    return {
      store,
      types,
      chosen_tags,
      chosen_stat,
      stat_modifier,
      gauge_modifier,
      chosen_modifier_tags_add,
      chosen_modifier_tags_remove,
      challenge_difficulty
    }
  },
  mounted() {
    this.updateColorDifficulty();
  },
  computed: {
    labelDifficulty: function() {
      let levels = [
        {value:-8, label:this.$t('dif_cake')},
        {value:-6, label:this.$t('dif_ext_easy')},
        {value:-4, label:this.$t('dif_very_easy')},
        {value:-2, label:this.$t('dif_easy')},
        {value:0, label:this.$t('dif_moderate')},
        {value:2, label:this.$t('dif_hard')},
        {value:4, label:this.$t('dif_very_hard')},
        {value:6, label:this.$t('dif_extreme')},
        {value:8, label:this.$t('dif_impossible')},
      ]
      for (let level of levels) {
        if (this.challenge_difficulty <= level.value) {
          return level.label;
        }
      }
    }
  },
  methods: {
    updateColorDifficulty() {
      let green;
      let red;
      if (this.challenge_difficulty >= 0) {
        red = 255;
      }
      if (this.challenge_difficulty <= 0) {
        green = 255;
      }

      if (this.challenge_difficulty > 0) {
        green = 255 - ((this.challenge_difficulty) / 8 * 255)
      }
      else if (this.challenge_difficulty < 0) {
        red = 255 - ((-this.challenge_difficulty) / 8 * 255)
      }

      let rgba = 'rgba(' + red + ',' + green + ',0,1)';
      document.documentElement.style.setProperty('--slider-connect-bg', rgba);
    },
    modifierChange(name, type, key, value) {
      if (this[name + '_modifier'][type][key] === undefined) {
        this[name + '_modifier'][type][key] = value;
      }
      else {
        this[name + '_modifier'][type][key] += value
      }
      if (this[name + '_modifier'][type][key] === 0) {
        delete this[name + '_modifier'][type][key];
      }
    },
    addTag(tag_label, type) {
      let group = this.store.tag_groups.find((element) => (element.code === 'freetag'));
      if (group === undefined) {
        group = this.store.addGroupTag(true);
      }
      let tag = this.store.addTag(tag_label, group);
      this.chosen_modifier_tags_add[type].push(tag);
    },
    startChallenge() {
      const date = Date.now();
      let nb_success = 0;
      const vm = this;
      let selectedCharacters
      if (this.chosen_tags.length) {
        selectedCharacters = this.store.alive_characters.filter(
          function(character) {
            return vm.store.filterCharacterByTagsAndPicked(character, vm.chosen_tags);
          }
        )
      }
      else {
        selectedCharacters = this.store.alive_characters;
      }

      selectedCharacters.forEach(function(character) {
        character.in_progress = true;
        let messages = [];
        let result = 'failure';
        let die_throw = Math.floor(Math.random() * 20 + 1) + vm.challenge_difficulty;
        if (die_throw === 1 || die_throw <= character.stats[vm.chosen_stat].value) {
          result = 'success';
          nb_success += 1;
        }

        messages.push(vm.$t('challenge_' + result, {stat: vm.store.current_game.stats[vm.chosen_stat].name}));

        if (vm.gauge_modifier[result] !== undefined) {
          for (const [key, bonus] of Object.entries(vm.gauge_modifier[result])) {
            messages.push(vm.$t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.store.current_game.gauges[key].name}));
            character.gauges[key].value += bonus;
          }
        }
        if (vm.stat_modifier[result] !== undefined) {
          for (const [key, bonus] of Object.entries(vm.stat_modifier[result])) {
            messages.push(vm.$t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.store.current_game.stats[key].name}));
            character.stats[key].value += bonus;
          }
        }
        if (vm.chosen_modifier_tags_add[result] !== undefined) {
          vm.chosen_modifier_tags_add[result].forEach(function(tag) {
            let found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
            if (found === -1) {
              character.tags.push(tag);
              messages.push(vm.$t('added_tag', {tag_label: tag.label}) );
            }
          });
        }
        if (vm.chosen_modifier_tags_remove[result] !== undefined) {
          vm.chosen_modifier_tags_remove[result].forEach(function(tag) {
            let found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
            if (found !== -1) {
              character.tags.splice(found, 1);
              messages.push(vm.$t('removed_tag', {tag_label: tag.label}) );
            }
          });
        }

        character.challenge = {date: date, result: result, message: messages };
        delete character.in_progress;
      })
      let nb_failure = selectedCharacters.length - nb_success;
      this.store._last_challenge = {
        date: date,
        nb_success: nb_success,
        nb_failure: nb_failure,
        rate: Math.floor(100 / selectedCharacters.length * nb_success)
      }
      this.$parent.changeTab('characters');
      this.challenge_difficulty = 0;
      this.chosen_stat = '';
      this.chosen_tags = [];

      //Todo better.
      this.stat_modifier.success = {};
      this.stat_modifier.failure = {};
      this.gauge_modifier.success = {};
      this.gauge_modifier.failure = {};
      this.chosen_modifier_tags_add.success = [];
      this.chosen_modifier_tags_add.failure = [];
      this.chosen_modifier_tags_remove.success = [];
      this.chosen_modifier_tags_remove.failure = [];
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <span v-if="store.stats !== undefined && Object.keys(store.stats).length === 0">{{ $t("must_first") }}<button @click="$parent.changeTab('settings')">{{ $t('add_stat') }}</button></span>
    <div ref="step_challenge_1" id='tab-challenge-content' v-if="store.stats !== undefined && Object.keys(store.stats).length > 0">
      <div id="chosen-targets">
        <div>
          <label for="chosen_stat">{{ $t('tested_stat') }}</label>
          <select id="chosen_stat" v-model="chosen_stat">
            <option value="" >{{ $t('choose_stat') }}</option>
            <option :value="key" v-for="(stat, key) in store.current_game.stats">{{ stat.name }}</option>
          </select>
        </div>
        <div>
          <label for="difficulty">{{ $t('difficulty') }}<span class="label-difficulty">{{ labelDifficulty }}</span></label>
          <Slider
              v-model="challenge_difficulty"
              :min="-8"
              :max="8"
              :lazy="false"
              tooltipPosition="bottom"
              @update="updateColorDifficulty"
          />
        </div>
        <div>
          <label for="chosen_tags">{{ $t('targets') }}</label>
          <vue-multiselect
              ref="chosen_tags"
              id="chosen_tags"
              v-model="chosen_tags"
              label="label"
              track-by="code"
              group-values="tags"
              group-label="label"
              :group-select="true"
              :placeholder="$t('add_target')"
              :tagPlaceholder="$t('add_target')"
              :noOptions="$t('everyone')"
              :options=store.tag_groups_plus_targets
              :multiple="true"
              :taggable="false"
              :hideSelected="true"
          >
          </vue-multiselect>
        </div>
      </div>

      <template v-for="type in types">
        <div :id="'chosen-'+type"  v-if="chosen_stat !== ''" :class="'type-'+type" >
          <span class="label-wrapper">{{ type === 'success' ?  $t('positive_csq')  :  $t('negative_csq') }}</span>
          <div>
            <div class="modifiers-buttons" v-for="(gauge, key) in store.current_game.gauges">
              <span class="modifier-label">{{ gauge.name }}</span>
              <div>
                <button @click="modifierChange('gauge', type, key,  -1)">-</button>
                <span class="modifier-value">{{ gauge_modifier[type][key] !== undefined ? (gauge_modifier[type][key] >= 0 ? "+" : '') + gauge_modifier[type][key] : "+0" }}</span>
                <button @click="modifierChange('gauge', type, key, +1)">+</button>
              </div>
            </div>
            <div class="modifiers-buttons" v-for="(stat, key) in store.current_game.stats">
              <span class="modifier-label">{{ stat.name }}</span>
              <div>
                <button @click="modifierChange('stat', type, key, -1)">-</button>
                <span class="modifier-value">{{ stat_modifier[type][key] !== undefined ? (stat_modifier[type][key] >= 0 ? "+" : '') + stat_modifier[type][key] : "+0" }}</span>
                <button @click="modifierChange('stat', type, key, +1)">+</button>
              </div>
            </div>
          </div>
          <div>
            <label :for="'chosen_modifier_tags_add_'+type">{{ $t('add_tags') }}</label>
            <vue-multiselect
                :id="'chosen_modifier_tags_add_'+type"
                v-model="chosen_modifier_tags_add[type]"
                label="label"
                track-by="code"
                :tag-placeholder="$t('add_tag')"
                :placeholder="$t('input_word')"
                :noOptions="$t('no_tag_create')"
                group-values="tags"
                group-label="label"
                :group-select="false"
                :options=store.tag_groups
                :multiple="true"
                :taggable="true"
                :hideSelected="true"
                @tag="addTag($event, type)"
            ></vue-multiselect>
          </div>
          <div class="full">
            <label :for="'chosen_modifier_tags_remove_'+type">{{ $t('remove_tag') }}</label>
            <vue-multiselect
                :id="'chosen_modifier_tags_remove_'+type"
                v-model="chosen_modifier_tags_remove[type]"
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
                @tag="addTag($event, type)"
            ></vue-multiselect>
          </div>
        </div>
      </template>

      <div id="summary-target" v-if="chosen_stat !== ''">
        <div>
          <span>{{ $t('this_will_test') }}{{ store.stats[chosen_stat].name.toLowerCase() }}</span>
          <span v-if="chosen_tags.length === 0">{{ $t('for_everyone') }}</span>
          <div v-if="chosen_tags.length > 0">
            <span>{{ $t('for_every') }}</span>
            <span v-for="(tag, key) in chosen_tags">
            {{ (key > 0) ? ',' : '' }}
            {{ tag.label }}
          </span>
          </div>
        </div>

        <template v-for="type in types">
          <div>
            <span v-if="Object.keys(gauge_modifier[type]).length || Object.keys(stat_modifier[type]).length || chosen_modifier_tags_add[type].length || chosen_modifier_tags_remove[type].length">{{ $t('challenge_characters') }}{{ type === 'success' ? $t('that_pass') : $t('that_fail') }}{{ $t('will_have') }}</span>
            <div class="inline">
              <span v-for="(modifier, key) in gauge_modifier[type]">
                {{ store.gauges[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
              </span>
                <span v-for="(modifier, key) in stat_modifier[type]">
                {{ store.stats[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
              </span>
            </div>
            <div class="full" v-if="chosen_modifier_tags_add[type].length > 0">
              <span>{{ $t('get_following_tags') }}</span>
              <span v-for="tag in chosen_modifier_tags_add[type]">
                {{ tag.label }}
              </span>
            </div>
            <div class="full" v-if="chosen_modifier_tags_remove[type].length > 0">
              <span>{{ $t("lose_following_tags") }}</span>
              <span v-for="tag in chosen_modifier_tags_remove[type]">
                {{ tag.label }}
              </span>
            </div>
          </div>
        </template>
        <button @click="startChallenge()">{{ $t("start_challenge") }}</button>
      </div>
    </div>

  </div>
</template>

<style lang="scss">
  #tab-challenge-content {
    counter-set: step-challenge;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    grid-gap: 15px;

    #chosen_stat {
      height: 40px;
    }

    #chosen-targets {
      flex-direction: row;

      > div {
        flex-direction: column;
        flex: 1;
      }
    }

    > div {
      display: flex;
      flex-basis: 100%;
      flex-direction: column;
      background: var(--background-card-color);;
      border-radius: 10px;
      padding: 15px;
      align-items: center;
      justify-content: center;
      gap: 30px;

      > div {
        display: flex;
        align-items: center;
        gap: 10px;

        &.inline {
          flex-wrap: wrap;
        }

        .full {
          flex-basis: 100%;
        }
      }
    }

    #summary-target {
      flex: 1;

      > div {
        display: flex;
        flex-direction: column;

        > div {
          display: flex;
          gap: 10px;
        }
      }
    }
    #chosen-success,
    #chosen-failure {
      flex: 1;

      input[type="number"] {
        width: 46px;
        border-radius: 100%;
        text-align: center;
        height: 46px;
      }

      > div {
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
            gap: 5px;
            align-items: center;

            > .modifier-value {
              flex: 1;
            }
            > button {
              text-align: center;
              display: inline-block;
              border-radius: 100%;
              width: 30px;
              height: 28px;
              padding: 0;
              flex: 1;
            }
          }

          > .modifier-label {
            flex-basis: 100%;
          }
        }
      }
    }

    .positive {
      border-color: lightgreen;
    }
    .negative {
      border-color: lightcoral;
    }
  }

  .slider-target {
    width: 100%;
  }
  .slider-tooltip {
    background: var(--background-card-color);
    border: 1px solid var(--font-color);
    color: var(--font-color);
  }
  .label-difficulty {
    color: var(--slider-connect-bg);
  }

  .summary {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .select {
    height: 49px;
    background: var(--font-color);
    border-radius: 8px;
    color: var(--background-color);
    border: 1px solid var(--font-color);
  }

  .multiselect__placeholder {
    display: none;
  }

  :root {
    --slider-height: 40px;
  }
</style>