<script>
import router, { usePlayerStore } from '../main';
import VueMultiselect from 'vue-multiselect'
import Slider from "@vueform/slider"
import {watch} from "vue";

export default {
  components: { VueMultiselect, Slider },
  data() {
    const store = usePlayerStore();
    const types = ['success', 'failure'];
    const chosen_stat = '';
    const chosen_tags = [];
    const stat_modifier = {'success': {}, 'failure': {}};
    const gauge_modifier = {'success': {}, 'failure': {}};
    const stat_group_modifier = {'success': {}, 'failure': {}};
    const gauge_group_modifier = {'success': {}, 'failure': {}};
    const marker_group_modifier = {'success': {}, 'failure': {}};
    const chosen_modifier_tags_add = {'success': [], 'failure': []};
    const chosen_modifier_tags_remove = {'success': [], 'failure': []};
    const chosen_group_modifier_tags_add = {'success': [], 'failure': []};
    const chosen_group_modifier_tags_remove = {'success': [], 'failure': []};
    const challenge_difficulty = 0;
    const group_slider = 50;
    const group_connect = [true, true];
    const has_neutral_zone = false;
    const consequences_individual = false;
    const consequences_group = false;
    const targets_operator = 'one'
    const tab_consequences_open = false;

    return {
      store,
      types,
      chosen_tags,
      chosen_stat,
      stat_modifier,
      gauge_modifier,
      stat_group_modifier,
      gauge_group_modifier,
      marker_group_modifier,
      group_slider,
      group_connect,
      has_neutral_zone,
      chosen_modifier_tags_add,
      chosen_modifier_tags_remove,
      chosen_group_modifier_tags_add,
      chosen_group_modifier_tags_remove,
      challenge_difficulty,
      consequences_individual,
      consequences_group,
      tab_consequences_open
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
    modifierChange(name, type, key, value, group = false) {
      let str_modifier = group ? '_group_modifier' : '_modifier';
      if (this[name + str_modifier][type][key] === undefined) {
        this[name + str_modifier][type][key] = value;
      }
      else {
        this[name + str_modifier][type][key] += value
      }
      if (this[name + str_modifier][type][key] === 0) {
        delete this[name + str_modifier][type][key];
      }
    },
    addTag(tag_label, type, is_group_consequences = false) {
      let group = this.store.tag_groups.find((element) => (element.code === 'freetag'));
      if (group === undefined) {
        group = this.store.addGroupTag(true);
      }
      let tag = this.store.addTag(tag_label, group);
      if (is_group_consequences) {
        this.chosen_group_modifier_tags_add[type].push(tag);
      }
      else {
        this.chosen_modifier_tags_add[type].push(tag);
      }

    },
    startChallenge() {
      const vm = this;
      let challenge = {
        stat: vm.chosen_stat,
        difficulty: vm.challenge_difficulty,
        tags: vm.chosen_tags,
        gauge_modifier: vm.gauge_modifier,
        stat_modifier: vm.stat_modifier,
        gauge_group_modifier: vm.gauge_group_modifier,
        stat_group_modifier: vm.stat_group_modifier,
        marker_group_modifier: vm.marker_group_modifier,
        chosen_modifier_tags_add: vm.chosen_modifier_tags_add,
        chosen_modifier_tags_remove: vm.chosen_modifier_tags_remove,
        chosen_group_modifier_tags_add: vm.chosen_group_modifier_tags_add,
        chosen_group_modifier_tags_remove: vm.chosen_group_modifier_tags_remove,
        scale: vm.group_slider
      };
      vm.store.addChallenge(challenge);

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
      challenge.nb_targets = selectedCharacters.length;

      // Loop on each character to trigger rolls.
      selectedCharacters.forEach(function(character) {
        let player_challenge = {
          date: challenge.date,
          wait_roll: true,
          difficulty: challenge.difficulty,
          stat: challenge.stat,
          timer: vm.store.current_game.settings.timer ?? 15
        };

        if (
            character.connection !== null &&
            vm.store.connections[character.connection] !== undefined &&
            vm.store.connections[character.connection].open
        ) {
          // Send an ask for an action before roll for connected character.
          character.challenge = player_challenge;
        }
        else {
          // Roll directly for disconnected characters (npc or disconnected player).
          //vm.store.resolveRoll(character);
          character.challenge = player_challenge;
        }
      });

      this.$parent.changeTab('characters');
      this.resetChallenge();
    },
    resetChallenge() {
      this.challenge_difficulty = 0;
      this.chosen_stat = '';
      this.chosen_tags = [];
      this.stat_modifier = {'success': {}, 'failure': {}};
      this.gauge_modifier = {'success': {}, 'failure': {}};
      this.chosen_modifier_tags_add = {'success': [], 'failure': []};
      this.chosen_modifier_tags_remove = {'success': [], 'failure': []};
      this.stat_group_modifier = {'success': {}, 'failure': {}};
      this.gauge_group_modifier = {'success': {}, 'failure': {}};
      this.marker_group_modifier = {'success': {}, 'failure': {}};
      this.chosen_group_modifier_tags_add = {'success': [], 'failure': []};
      this.chosen_group_modifier_tags_remove = {'success': [], 'failure': []};
    },
    toggleNeutralZone() {
      if (this.has_neutral_zone) {
        this.group_slider = 50;
        this.group_connect = [true,  true];
      }
      else {
        this.group_slider = [30, 70];
        this.group_connect = [true, false, true];
      }
      this.has_neutral_zone = !this.has_neutral_zone;
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <span v-if="store.stats !== undefined && Object.keys(store.stats).length === 0">{{ $t("must_first") }}<button @click="$parent.changeTab('settings')">{{ $t('add_stat') }}</button></span>
    <div ref="step_challenge_1" id='tab-challenge-content' v-if="store.stats !== undefined && Object.keys(store.stats).length > 0">
      <div class="new-challenge" v-if="this.store.last_challenge === undefined || !this.store.last_challenge.active">
        <div id="challenge-basics">
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
                id="difficulty"
                v-model="challenge_difficulty"
                :min="-8"
                :max="8"
                :lazy="false"
                tooltipPosition="bottom"
                @update="updateColorDifficulty"
            />
          </div>
          <div id="group-difficulty">
            <label for="group-difficulty-slider">{{ $t('success_threshold') }}</label>
            <Slider
                id="group-difficulty-slider"
                :options="{connect: group_connect, padding: [1, 1]}"
                v-model="group_slider"
                :min="0"
                :max="100"
                :format="function (value) {
            return Math.round(value) + '%';
          }"
            />
            <button @click="toggleNeutralZone">{{ has_neutral_zone ? $t('Retirer la zone sans effet') : $t('Ajouter une zone sans effet') }}</button>
          </div>
          <div id="challenge-targets">
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
<!--          <div>-->
<!--            <label for="targets_operator">Règle de sélection des cibles</label>-->
<!--            <select id="targets_operator" v-model="targets_operator">-->
<!--              <option value="one">Possède un des tags</option>-->
<!--              <option value="all">Possède tous les tags</option>-->
<!--            </select>-->
<!--          </div>-->
        </div>
        <div id="consequences">
          <div class="buttons">
            <button :class="{open: tab_consequences_open === false}" @click="tab_consequences_open = false">Conséquences par personnage</button>
            <button :class="{open: tab_consequences_open === true}" @click="tab_consequences_open = true">Conséquence pour le groupe</button>
          </div>
          <div id="individual-consequences" :class="{open: tab_consequences_open === false}">
            <div class="description-wrapper">{{ $t('Chaque personnage lancera un dé, auquel sera ajoutée la difficulté, et devra faire moins que la caractéristique testée.') }}</div>
            <div class="type-wrapper">
              <template v-for="type in types">
                <div :id="'chosen-'+type" :class="'type type-'+type" >
                  <span class="label-wrapper">{{ type === 'success' ?  $t('positive_csq')  :  $t('negative_csq') }}</span>
                  <div class="modifiers-buttons-container">
                    <div class="modifiers-buttons" v-for="(gauge, key) in store.current_game.gauges">
                      <span class="modifier-label">{{ gauge.name }}</span>
                      <div>
                        <button @click="modifierChange('gauge', type, key,  1)">+</button>
                        <span class="modifier-value" :class="gauge_modifier[type][key] > 0 ? 'positive' : (gauge_modifier[type][key] < 0 ? 'negative' : '')">
                          {{ gauge_modifier[type][key] !== undefined ? (gauge_modifier[type][key] >= 0 ? "+" : '') + gauge_modifier[type][key] : "+0" }}
                        </span>
                        <button @click="modifierChange('gauge', type, key, -1)">-</button>
                      </div>
                    </div>
                    <div class="modifiers-buttons" v-for="(stat, key) in store.current_game.stats">
                      <span class="modifier-label">{{ stat.name }}</span>
                      <div>
                        <button @click="modifierChange('stat', type, key, 1)">+</button>
                        <span class="modifier-value" :class="stat_modifier[type][key] > 0 ? 'positive' : (stat_modifier[type][key] < 0 ? 'negative' : '')">
                          {{ stat_modifier[type][key] !== undefined ? (stat_modifier[type][key] >= 0 ? "+" : '') + stat_modifier[type][key] : "+0" }}
                        </span>
                        <button @click="modifierChange('stat', type, key, -1)">-</button>
                      </div>
                    </div>
                  </div>
                  <div class="select-tags-wrapper">
                    <div class="select-tags">
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
                    <div class="select-tags">
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
                </div>
              </template>
            </div>
          </div>
          <div id="group-consequences" :class="{open: tab_consequences_open === true}">
            <div class="description-wrapper">{{ $t('Chaque personnage subira les conséquences selon le pourcentage de réussite du groupe.') }}</div>
            <div class="type-wrapper">
              <template v-for="type in types">
                <div :id="'chosen-group-'+type" :class="'type type-'+type" >
                  <span class="label-wrapper">{{ type === 'success' ?  $t('positive_csq')  :  $t('negative_csq') }}</span>
                  <div class="modifiers-buttons-container">
                    <div class="modifiers-buttons" v-for="(gauge, key) in store.current_game.gauges">
                      <span class="modifier-label">{{ gauge.name }}</span>
                      <div>
                        <button @click="modifierChange('gauge', type, key,  -1, true)">-</button>
                        <span class="modifier-value" :class="gauge_group_modifier[type][key] > 0 ? 'positive' : (gauge_group_modifier[type][key] < 0 ? 'negative' : '')">
                          {{ gauge_group_modifier[type][key] !== undefined ? (gauge_group_modifier[type][key] >= 0 ? "+" : '') + gauge_group_modifier[type][key] : "+0" }}
                        </span>
                        <button @click="modifierChange('gauge', type, key, 1, true)">+</button>
                      </div>
                    </div>
                    <div class="modifiers-buttons" v-for="(stat, key) in store.current_game.stats">
                      <span class="modifier-label">{{ stat.name }}</span>
                      <div>
                        <button @click="modifierChange('stat', type, key, -1, true)">-</button>
                        <span class="modifier-value" :class="stat_group_modifier[type][key] > 0 ? 'positive' : (stat_group_modifier[type][key] < 0 ? 'negative' : '')">
                          {{ stat_group_modifier[type][key] !== undefined ? (stat_group_modifier[type][key] >= 0 ? "+" : '') + stat_group_modifier[type][key] : "+0" }}
                        </span>
                        <button @click="modifierChange('stat', type, key, 1, true)">+</button>
                      </div>
                    </div>
                    <div class="modifiers-buttons" v-for="(marker, key) in store.current_game.markers">
                      <span class="modifier-label">{{ marker.name }}</span>
                      <div>
                        <button @click="modifierChange('marker', type, key, -1, true)">-</button>
                        <span class="modifier-value">{{ marker_group_modifier[type][key] !== undefined ? (marker_group_modifier[type][key] >= 0 ? "+" : '') + marker_group_modifier[type][key] : "+0" }}</span>
                        <button @click="modifierChange('marker', type, key, 1, true)">+</button>
                      </div>
                    </div>
                  </div>
                  <div class="select-tags-wrapper">
                    <div class="select-tags">
                      <label :for="'chosen_group_modifier_tags_add_'+type">{{ $t('add_tags') }}</label>
                      <vue-multiselect
                          :id="'chosen_group_modifier_tags_add_'+type"
                          v-model="chosen_group_modifier_tags_add[type]"
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
                          @tag="addTag($event, type, true)"
                      ></vue-multiselect>
                    </div>
                    <div class="select-tags">
                      <label :for="'chosen_group_modifier_tags_remove_'+type">{{ $t('remove_tag') }}</label>
                      <vue-multiselect
                          :id="'chosen_group_modifier_tags_remove_'+type"
                          v-model="chosen_group_modifier_tags_remove[type]"
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
                          @tag="addTag($event, type, true)"
                      ></vue-multiselect>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

        </div>
        <div id="challenge-summary" v-if="chosen_stat !== ''">
          <div>
            <span>{{ $t('this_will_test') }}{{ store.stats[chosen_stat].name.toLowerCase() }}</span>
            <span v-if="chosen_tags.length === 0">{{ $t('for_everyone') }}</span>
            <div class="summmary-tags" v-if="chosen_tags.length > 0">
              <span>{{ $t('for_every') }}</span>
              <span v-for="(tag, key) in chosen_tags">
                {{ tag.label }}
              </span>
            </div>
          </div>
          <div>
            <template v-for="type in types">
              <span v-if="Object.keys(gauge_modifier[type]).length || Object.keys(stat_modifier[type]).length || chosen_modifier_tags_add[type].length || chosen_modifier_tags_remove[type].length">{{ $t('challenge_characters') }}{{ type === 'success' ? $t('that_pass') : $t('that_fail') }}{{ $t('will_have') }}</span>
              <div v-if="Object.keys(gauge_modifier[type]).length || Object.keys(stat_modifier[type]).length">
                <span v-for="(modifier, key) in gauge_modifier[type]">
                  {{ store.gauges[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
                </span>
                <span v-for="(modifier, key) in stat_modifier[type]">
                  {{ store.stats[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
                </span>
              </div>
              <div class="summmary-tags" v-if="chosen_modifier_tags_add[type].length > 0">
                <span>{{ $t('get_following_tags') }}</span>
                <span v-for="tag in chosen_modifier_tags_add[type]">
                  {{ tag.label }}
                </span>
              </div>
              <div class="summmary-tags" v-if="chosen_modifier_tags_remove[type].length > 0">
                <span>{{ $t("lose_following_tags") }}</span>
                <span v-for="tag in chosen_modifier_tags_remove[type]">
                  {{ tag.label }}
                </span>
              </div>
            </template>
          </div>

          <div>
            <template v-for="type in types">
            <span v-if="Object.keys(gauge_group_modifier[type]).length || Object.keys(stat_group_modifier[type]).length || chosen_group_modifier_tags_add[type].length || chosen_group_modifier_tags_remove[type].length">
              {{ type === 'success' ?
                $t('group_consequences_summary_success', {rate: group_slider[1] === undefined ? group_slider : group_slider[0]}) :
                $t('group_consequences_summary_failure', {rate: group_slider[1] ?? group_slider }) }}
            </span>
              <div v-if="Object.keys(gauge_group_modifier[type]).length || Object.keys(stat_group_modifier[type]).length">
              <span v-for="(modifier, key) in gauge_group_modifier[type]">
                {{ store.gauges[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
              </span>
                <span v-for="(modifier, key) in stat_group_modifier[type]">
                {{ store.stats[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
              </span>
              </div>
              <div class="summmary-tags" v-if="chosen_group_modifier_tags_add[type].length > 0">
                <span>{{ $t('get_following_tags') }}</span>
                <span v-for="tag in chosen_group_modifier_tags_add[type]">
                {{ tag.label }}
              </span>
              </div>
              <div class="summmary-tags" v-if="chosen_group_modifier_tags_remove[type].length > 0">
                <span>{{ $t("lose_following_tags") }}</span>
                <span v-for="tag in chosen_group_modifier_tags_remove[type]">
                {{ tag.label }}
              </span>
              </div>
            </template>
          </div>
          <button class="btn-valid" :disabled="chosen_stat === ''" @click="startChallenge()">{{ $t("start_challenge") }}</button>
        </div>
      </div>
      <div class="finish-challenge" v-else>
        <div>Vous devez terminer l'épreuve en cours pour en démarrer une nouvelle.</div>
        <div v-if="this.store.last_challenge.resolved === undefined">Fin de l'épreuve dans : {{ this.store.last_challenge.timer }}s</div>
        <button v-else class="btn-valid btn-finish-challenge" @click="this.store.finishChallenge()">Terminer l'épreuve</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  #tab-challenge-content {
    > div.new-challenge {
      counter-set: step-challenge;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      grid-gap: 15px;

      > div {
        display: flex;
        flex: 0.3;
        flex-direction: column;
        background: var(--background-card-color);;
        border-radius: 10px;
        padding: 15px;
        justify-content: space-between;
        gap: 20px;

        .description-wrapper {
          text-align: left;
          margin: 10px 0;
        }
      }

      #targets_operator,
      #chosen_stat {
        height: 40px;
      }

      #consequences {
        background: unset;
        margin: -15px;
        gap: 0;
        flex: 1;

        > .buttons {
          align-self: stretch;
          display: flex;
          gap: 15px;
          background: var(--background-color);

          > button {
            border-radius: 10px 10px 0 0;
            background: lightgrey;
            color: black;

            &.open {
              background: var(--background-card-color);
              color: var(--font-color);
            }
          }
        }

        > div:not(.buttons) {
          background: var(--background-card-color);
          border-radius: 0 15Px 15px 15px;
          padding: 15px;
          display: none;
          flex: 1;
          gap: 10px;

          &.open {
            display: flex;
            flex-direction: column;
          }

          .type-wrapper {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
        }
      }

      #group-consequences {
        .buttons {
          flex-direction: column;
          align-items: stretch;
        }
      }

      #challenge-basics {
        align-self: flex-start;

        > span {
          margin-bottom: auto;
        }

        button {
          margin-top: auto;
        }

        > div {
          flex-direction: column;
          display: flex;
          gap: 5px;

          > label {
            font-weight: bold;
            text-align: left;
            margin-bottom: 10px;
          }
        }

        #group-difficulty-slider {
          gap: 10px;
          height: 40px;
          margin: 20px 0;

          .slider-target {
            flex: 1;
          }

          button {
            font-size: 0.75em;
            height: 40px;
          }

          .slider-base {
            height: 40px;
          }

          .slider-connect {
            background: var(--failure-background);

            + .slider-connect {
              background: var(--success-background);
            }
          }

          .slider-origin {
            .slider-tooltip {
              background: var(--failure-background);
              color: white;
            }

            .slider-tooltip-top:before {
              border: none;
            }

            + .slider-origin {
              .slider-tooltip {
                background: var(--success-background);
                transform: translate(-50%, 200%);
              }
            }
          }
        }

        #challenge-targets {
          position: relative;
          min-width: 267px;
          font-weight: bold;

          .multiselect__input {
            top: -1.4em;
            min-height: 1.4em;
            line-height: 1.4em;
          }

          > label {
            position: absolute;
            left: 0;
            top: -0.4em;
          }
        }
      }

      #challenge-summary {
        text-align: left;

        > div {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          flex: 1;

          > span {
            font-weight: bold;
          }

          > div {
            display: flex;
            gap: 10px;

            &.summmary-tags {
              gap: 0 5px;
              flex-wrap: wrap;

              span:nth-child(n+2) {
                border-radius: 5px;
                background: black;
                color: white;
                padding: 0 5px;
              }
            }
          }
        }
      }

      .type-success > span:before {
        background: var(--success-background);
      }
      .type-failure > span:before {
        background: var(--failure-background);
      }

      .type {
        display: flex;
      }

      .type-success,
      .type-failure {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 15px;
        background: #ffffff2e;
        padding: 15px;

        > span {
          flex-basis: 100%;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;

          &:before {
            content: '';
            border-radius: 100%;
            width: 20px;
            height: 20px;
          }
        }

        .select-tags-wrapper {
          flex: 1;

          > .select-tags {
            flex: 1 0 0;
            position: relative;
            min-width: 267px;
            font-weight: bold;

            .multiselect__input {
              top: -1.4em;
              min-height: 1.4em;
              line-height: 1.4em;
            }

            > label {
              position: absolute;
              left: 0;
              top: -0.4em;
            }
          }
        }

        > div {
          display: flex;
          gap: 10px;

          &.modifiers-buttons-container {
            align-items: flex-start;
            flex-wrap: wrap;
            flex-basis: 100%;
            gap: 30px;

            @include media("<=desktop") {
              gap: 10px;
            }
          }

          .modifiers-buttons {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 14px 0;
            gap: 5px;

            > div {
              display: flex;
              align-items: center;
              flex-direction: column;

              > .modifier-value {
                border: 1px solid black;
                width: 25px;
                border-radius: 5px;
                transition: all 0.5s linear;

                &.positive {
                  background: var(--success-background);
                  color: white;
                }
                &.negative {
                  background: var(--failure-background);
                  color: white;
                }
              }

              > button {
                position: relative;
                background: none;
                text-align: center;
                display: inline-block;
                border-radius: 0;
                border: none;
                outline: none;
                width: 25px;
                height: 28px;
                padding: 0;
                flex: 1;
                font-size: 0;

                &:after {
                  position: absolute;
                  content: '';
                  height: 0;
                  width: 0;
                  left: 0;
                  border-right: 12px solid transparent;
                  border-left: 12px solid transparent;
                }

                &:first-child {
                  &:hover:after, &:focus-visible:after {
                    border-bottom-color: var(--success-background);
                  }
                  &:after {
                    border-bottom: 13px solid black;
                    bottom: 1px;
                  }
                }
                &:last-child {
                  &:hover:after, &:focus-visible:after {
                    border-top-color: var(--failure-background);
                  }
                  &:after {
                    border-top: 13px solid black;
                    top: 1px;
                  }
                }
              }
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

      .slider-target {
        width: 100%;
      }
      .slider-tooltip {
        background: var(--background-card-color);
        border: 1px solid var(--font-color);
        color: var(--font-color);
      }
    }

    > div.finish-challenge {
      display: flex;
      flex: 1;
      flex-direction: column;
      background: var(--background-card-color);;
      border-radius: 10px;
      padding: 15px;
      align-items: center;
      justify-content: space-between;
      gap: 30px;
    }
  }

  :root {
    --slider-height: 40px;
  }
</style>