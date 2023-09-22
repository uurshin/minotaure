<script>
import router, { usePlayerStore } from '../main';
import VueMultiselect from 'vue-multiselect'
import Slider from "@vueform/slider"
import {useI18n} from "vue-i18n";

export default {
  components: { VueMultiselect, Slider },
  setup() {
    const { t } = useI18n()
    return { t }
  },
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
        {value:-8, label:'Trivial'},
        {value:-6, label:'Aisé'},
        {value:-4, label:'Facile'},
        {value:-2, label:'Assez facile'},
        {value:0, label:'Facile'},
        {value:2, label:'Assez difficile'},
        {value:4, label:'Difficile'},
        {value:6, label:'Ardu'},
        {value:8, label:'Cauchemardesque'},
      ]
      for (let level of levels) {
        if (this.challenge_difficulty <= level.value) {
          return level.label;
        }
      }
      return 'Hardcore';
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
    modifier_change(name, type, key, value) {
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
      const tag = {
        label: tag_label,
        code: tag_label.substring(0, 2) + Math.floor((Math.random() * 10000000))
      }
      let found = this.store.tag_groups.findIndex((element) => (element.freetag !== undefined));
      if (found === -1) {
        this.store.tag_groups.push({
          tags:[tag],
          start: false,
          freetag: true
        });
      }
      else {
        this.store.tag_groups[found].tags.push(tag);
      }
      this.chosen_modifier_tags_add[type].push(tag)
    },
    startChallenge() {
      const date = Date.now();
      let nb_success = 0;
      const vm = this;
      let selectedCharacters
      if (this.chosen_tags.length) {
        selectedCharacters = this.store.alive_characters.filter(
          function(character) {
            return(
              character.alive &&
              character.tags.find(
                (tag) => vm.chosen_tags.find((chosen_tag) => chosen_tag.code === tag.code)
              )
            )
          }
        );
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
              messages.push('tag ajouté : ' + tag.label);
            }
          });
        }
        if (vm.chosen_modifier_tags_remove[result] !== undefined) {
          vm.chosen_modifier_tags_remove[result].forEach(function(tag) {
            let found = character.tags.findIndex((character_tag) => character_tag.code === tag.code);
            if (found !== -1) {
              character.tags.splice(found, 1);
              messages.push('tag enlevé : ' + tag.label);
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
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <span v-if="store.stats !== undefined && Object.keys(store.stats).length === 0">Vous devez d'abord <button @click="$parent.changeTab('tab-stats')">créer une caractéristique</button></span>
    <div id='tab-challenge-content' v-if="store.stats !== undefined && Object.keys(store.stats).length > 0">
      <div id="chosen-targets">
        <div>
          <label for="chosen_stat">Caractéristique à tester</label>
          <select id="chosen_stat" v-model="chosen_stat">
            <option value="" >Choisissez une caractéristique</option>
            <option :value="key" v-for="(stat, key) in store.current_game.stats">{{ stat.name }}</option>
          </select>
        </div>
        <div>
          <label for="difficulty">Difficulté : <span class="label-difficulty">{{ labelDifficulty }}</span></label>
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
          <label for="chosen_tags">Cibles</label>
          <vue-multiselect
              ref="multiselect"
              id="chosen_tags"
              v-model="chosen_tags"
              label="label"
              track-by="code"
              placeholder="Ajouter une cible"
              tagPlaceholder="Ajouter une cible"
              noOptions="Tout le monde"
              :options=store.tags
              :multiple="true"
              :taggable="false"
              :hideSelected="true"
          >
          </vue-multiselect>
        </div>
      </div>

      <template v-for="type in types">
        <div :id="'chosen-'+type"  v-if="chosen_stat !== ''" :class="'type-'+type" >
          <span class="label-wrapper">Conséquences {{ type === 'success' ? 'positives' : 'négatives'}}</span>
          <div>
            <div v-for="(gauge, key) in store.current_game.gauges">
              <span class="modifier-label">{{ gauge.name }}</span>
              <div>
                <button @click="modifier_change('gauge', type, key,  -1)">-</button>
                <span class="modifier-value">{{ gauge_modifier[type][key] !== undefined ? (gauge_modifier[type][key] >= 0 ? "+" : '') + gauge_modifier[type][key] : "+0" }}</span>
                <button @click="modifier_change('gauge', type, key, +1)">+</button>
              </div>
            </div>
            <div v-for="(stat, key) in store.current_game.stats">
              <span class="modifier-label">{{ stat.name }}</span>
              <div>
                <button @click="modifier_change('stat', type, key, -1)">-</button>
                <span class="modifier-value">{{ stat_modifier[type][key] !== undefined ? (stat_modifier[type][key] >= 0 ? "+" : '') + stat_modifier[type][key] : "+0" }}</span>
                <button @click="modifier_change('stat', type, key, +1)">+</button>
              </div>
            </div>
          </div>
          <div>
            <label :for="'chosen_modifier_tags_add_'+type">Ajouter les tags</label>
            <vue-multiselect
                ref="multiselect"
                :id="'chosen_modifier_tags_add_'+type"
                v-model="chosen_modifier_tags_add[type]"
                label="label"
                track-by="code"
                tag-placeholder="Ajouter un tag"
                placeholder="Tapez un mot"
                noOptions="Aucun autre tag, inventez-en un !"
                :options="store.tags"
                :multiple="true"
                :taggable="true"
                :hideSelected="true"
                @tag="addTag($event, type)"
            ></vue-multiselect>
          </div>
          <div class="full">
            <label :for="'chosen_modifier_tags_remove_'+type">Retirer les tags</label>
            <vue-multiselect
                ref="multiselect"
                :id="'chosen_modifier_tags_remove_'+type"
                v-model="chosen_modifier_tags_remove[type]"
                label="label"
                track-by="code"
                placeholder="Tapez un mot"
                :showNoOptions="false"
                :options="store.tags"
                :multiple="true"
                :hideSelected="true"
            ></vue-multiselect>
          </div>
        </div>
      </template>

      <div id="summary-target" v-if="chosen_stat !== ''">
        <span>Vous allez déclencher une épreuve de {{ store.stats[chosen_stat].name.toLowerCase() }}</span>
        <span v-if="chosen_tags.length === 0">Pour tout le monde</span>
        <div v-if="chosen_tags.length > 0">
          <span>Pour chaque : </span>
          <span v-for="(tag, key) in chosen_tags">
            {{ (key > 0) ? ',' : '' }}
            {{ tag.label }}
          </span>
        </div>
        <template v-for="type in types">
          <span>Les personnages {{ type === 'success' ? 'réussissant' : 'échouant' }} obtiendrons :</span>
          <div class="inline">
            <span v-for="(modifier, key) in gauge_modifier[type]">
              {{ store.gauges[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
            </span>
            <span v-for="(modifier, key) in stat_modifier[type]">
              {{ store.stats[key].name }} {{ modifier > 0 ? '+' + modifier : modifier }}
            </span>
          </div>
          <div class="full" v-if="chosen_modifier_tags_add[type].length > 0">
            <span>Ces tags en plus : </span>
            <span v-for="tag in chosen_modifier_tags_add[type]">
            {{ tag.label }}
          </span>
          </div>
          <div class="full" v-if="chosen_modifier_tags_remove[type].length > 0">
            <span>Ces tags en moins (s'ils les ont) : </span>
            <span v-for="tag in chosen_modifier_tags_remove[type]">
            {{ tag.label }}
          </span>
          </div>
        </template>
        <button @click="startChallenge()">Lancer l'épreuve !</button>
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
      border: 1px solid var(--font-color);
      padding: 15px;
      align-items: center;

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

      gap: 15px;
    }

    #summary-target {
      flex: 1;
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

        > div {
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
    background: var(--background-color);
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

  .multiselect {
    width: auto;
  }

  .multiselect__tags {
    padding-top: 4px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
  .multiselect__placeholder {
    display: none;
  }
  .multiselect__input {
    display: inline !important;
    width: auto !important;
    position: relative !important;
  }

  :root {
    --slider-height: 40px;
  }
</style>