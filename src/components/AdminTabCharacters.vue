<script>
import { usePlayerStore } from '../main';
import VueMultiselect from 'vue-multiselect'
import {Dataset, DatasetItem, DatasetSearch, DatasetInfo, DatasetShow} from "vue-dataset";
import VueSimpleContextMenu from 'vue-simple-context-menu';
import Slider from "@vueform/slider"
import contenteditable from 'vue-contenteditable';

export default {
  components: {
    VueMultiselect,
    Dataset,
    DatasetItem,
    DatasetSearch,
    DatasetInfo,
    DatasetShow,
    VueSimpleContextMenu,
    Slider,
    contenteditable
  },
  setup() {
    const character_centered = null;
    return {
      character_centered
    };
  },
  data() {
    const store = usePlayerStore();

    return {
      store,
      tag_filter: [],
      search_character: '',
      filters: {},
      options_contextual: [{}],
      character_edit: 0
    }
  },
  computed: {
    current_challenge_rate: function() {
      if (this.store.last_challenge === undefined || !this.store.last_challenge.active) {
        return false;
      }
      else if (this.store.last_challenge.nb_targets * this.store.last_challenge.nb_success === 0) {
        return 0;
      }
      return Math.floor(100 / this.store.last_challenge.nb_targets * this.store.last_challenge.nb_success);
    },
    class_scale: function() {
      if (this.store.last_challenge.scale instanceof Array) {
        if (this.current_challenge_rate > this.store.last_challenge.scale[1]) { return 'scale-success' }
        else if (this.current_challenge_rate > this.store.last_challenge.scale[0]) { return 'scale-neutral' }
      }
      else if (this.current_challenge_rate >= this.store.last_challenge.scale) { return 'scale-success' }
      else if (this.current_challenge_rate === false) {
        return '';
      }

      return 'scale-failure';
    }
  },
  mounted() {
    this.$refs['dataset'].showEntries(10000);
  },
  methods: {
    getClasses(character) {
      let classes = [];
      if (this.store.last_challenge !== undefined && this.store.last_challenge.active && character.challenge !== undefined && character.challenge.date === this.store.last_challenge.date) {
        classes.push('result-' + character.challenge.result);
      }
      else {
        classes.push('result-neutral');
      }

      if (
          character.connection !== null &&
          this.store.connections[character.connection] !== undefined &&
          this.store.connections[character.connection].open === true
      ) {
        classes.push('connected');
      }

      if (character.picked) {
        classes.push('picked');
      }
      return classes;
    },
    filterOnTag(tags) {
      let found = true;
      if (this.tag_filter.length) {
        found = tags.find(
            (tag) => this.tag_filter.find(
                (chosen_tag) => chosen_tag.label === tag.label
            )
        );
      }
      return found !== undefined;
    },
    filterConnected(connection) {
      if (this.filters['connected'] !== undefined) {
        return (
          connection !== null &&
          this.store.connections[connection] !== undefined &&
          this.store.connections[connection].open === true
        )
      }
      return true;
    },
    filterPicked(picked) {
      if (this.filters['picked'] !== undefined) {
        return picked;
      }
      return true;
    },
    filterDead(dead) {
      if (this.filters['dead'] !== undefined) {
        return dead;
      }
      return true;
    },
    filterChallenge(challenge) {
      if (this.store.last_challenge === undefined) {
        return true;
      }
      if (this.filters['challenge'] !== undefined) {
        if (challenge.date === undefined) {
          return false;
        }
        // Todo challenge per game.
        else if (challenge.date === this.store.last_challenge.date) {
          return challenge.result === this.filters['challenge'];
        }
      }
      // Todo fix dead characters displayed.
      return true;
    },
    switchFilter(name) {
      if (this.filters[name] === undefined) {
        this.filters[name] = true;
      }
      else {
        delete this.filters[name];
      }
    },
    switchFilterChallenge(value) {
      if (this.filters['challenge'] === undefined || this.filters['challenge'] !== value) {
        this.filters['challenge'] = value;
      }
      else {
        delete this.filters['challenge'];
      }
    },
    resetFilters() {
      this.filters = {};
      this.tag_filter = [];
      this.search_character = '';
    },
    sortAsChallenge(challenge) {
      return (this.store.last_challenge !== undefined && this.store.last_challenge.active && challenge !== undefined && challenge.date === this.store.last_challenge.date);
    },
    sortAsConnected(connection) {
      return (
          connection !== null &&
          this.store.connections[connection] !== undefined &&
          this.store.connections[connection].open === true
      )
    },
    handleClick(event, item) {
      this.options_contextual = this.generateOptions(item)
      this.$refs.context_character.showMenu(event, item)
    },
    generateOptions(item) {
      let options = [];
      if (item.picked === undefined || !item.picked) {
        options.push({name: this.$t('context_add_selection_character'), effect: 'toggle'});
      } else {
        options.push({name: this.$t('context_remove_selection_character'), effect: 'toggle'});
      }
      options.push({name: this.$t('context_edit_character'), effect: 'edit'});
      options.push({name: this.$t('context_delete_character'), effect: 'delete'});
      return options;
    },
    optionClicked(event) {
      if (event.option.effect !== undefined) {
        let character = event.item;
        switch (event.option.effect) {
          case 'rename':
            // Todo rename.
            break;
          case 'delete':
            let foundIndex = this.store.characters.findIndex((found_character) => found_character.token === character.token);
            this.store.characters.splice(foundIndex, 1);
            break;
          case 'edit':
            character.editing = true;
            if (this.character_centered === null || this.character_centered.token !== character.token) {
              this.animateToCenter(character);
            }
            break;
          case 'toggle':
            this.toggleCharacter(character);
            break;
          case 'roll':
            this.store.resolveRoll(character);
            break;
        }
      }
    },
    toggleCharacter(character) {
      let found = this.store.characters.find((found_character) => found_character.token === character.token);
      found.picked = !found.picked;
    },
    selectVisible(ds) {
      ds.dsRows.forEach((row) => ds.dsData[row].picked = true);
    },
    animateToCenter(character) {
      let expand = false;
      if (this.character_centered === null || this.character_centered.token !== character.token) {
        expand = true;
      }
      else {
        character.editing = 0;
      }

      if (this.character_centered !== null) {
        this.$refs[this.character_centered.token].style.transform = null;
        this.$refs[this.character_centered.token].classList.remove('centered');
        this.character_centered.editing = 0;
        this.character_centered = null;
      }
      if (expand && character !== undefined) {
        this.character_centered = character;
        var rect = this.$refs[character.token].getBoundingClientRect();
        let scale = 2;
        // For bigger screens, the expanded card can take more space.
        if (window.screen.availHeight > 1000) {
          scale = 3;
        }
        let diffX = (window.innerWidth / 2) - rect.left - this.$refs[character.token].offsetWidth * scale / 2;
        let diffY = (window.innerHeight / 2) - rect.top - this.$refs[character.token].offsetHeight * scale / 2;
        this.$refs[character.token].style.transform = 'translate(' + diffX + 'px ,' + diffY + 'px) scale3D(' + scale + ',' + scale + ',' + scale + ')';
        this.$refs[character.token].classList.add('centered');
      }
    }
  }
}
</script>

<template>
  <VueSimpleContextMenu
      element-id="context_menu_characters"
      :options="options_contextual"
      ref="context_character"
      @option-clicked="optionClicked"
  />
  <div :style="cssVars" class="tab" ref="tab">
    <div id='tab-characters-content'>
      <div class="challenge-container" v-if="this.store.last_challenge !== undefined && this.store.last_challenge.active">
        <div v-if="this.store.last_challenge !== undefined && this.store.last_challenge.active" class="scale-container" :class="class_scale" >
          <Slider
              :options="{connect: [true, false] }"
              v-model="current_challenge_rate"
              :disabled="true"
              :tooltips="false"
          />
          <div v-if="this.store.last_challenge.scale instanceof Array">
            <span class="target-scale"
                  :class="{validated: current_challenge_rate > this.store.last_challenge.scale[0]}"
                  :style="{ left: this.store.last_challenge.scale[0] + '%' }"
            >
              {{ $t('challenge_scale_label_neutral', {scale: this.store.last_challenge.scale[0]}) }}
            </span>
              <span class="target-scale"
                    :class="{validated: current_challenge_rate > this.store.last_challenge.scale[1]}"
                    :style="{ left: this.store.last_challenge.scale[1] + '%' }"
              >
              {{ $t('challenge_scale_label', {scale: this.store.last_challenge.scale[1]}) }}
            </span>
          </div>

          <div v-else>
            <span class="target-scale"
                  :class="{validated: current_challenge_rate > this.store.last_challenge.scale}"
                  :style="{ left: this.store.last_challenge.scale + '%' }"
            >
              {{ $t('challenge_scale_label', {scale: this.store.last_challenge.scale}) }}
            </span>
          </div>
        </div>
        <div class="timer-challenge attention" v-if="this.store.last_challenge.result === undefined">
          {{ $t('challenged_end_in', {timer: this.store.last_challenge.timer}) }}
        </div>
        <div v-else class="result-container">
          <span>{{ $t('challenge_result_' + this.store.last_challenge.result) }} </span>
          <button class="btn-valid" @click="this.store.finishChallenge()">{{ $t('finish_challenge') }}</button>
        </div>
      </div>

      <div v-if="this.store.markers !== undefined" class="markers-container">
        <div v-for="marker in this.store.markers">
          <span>{{ marker.name }}</span>
          <contenteditable class="value" tag="span" contenteditable="true" v-model="marker.value" :no-nl="true" :no-html="true" />
        </div>
      </div>
      <div class="filter-data">
        <div v-if="store.tags.length">
          <vue-multiselect
              ref="tag_filter"
              id="tag_filter"
              v-model="tag_filter"
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
        <button @click="switchFilter('dead')" :class="{active : filters.dead !== undefined}">{{ $t('alive') }}</button>
        <button @click="switchFilter('connected')" :class="{active : filters.connected !== undefined}">{{ $t('connected') }}</button>
        <button v-if="store.picked_characters !== undefined && store.picked_characters.length" @click="switchFilter('picked')" :class="{active : filters.picked !== undefined}">{{ $t('char_picked') }}</button>
        <div class="dual-button" v-if="current_challenge_rate !== false">
          <button @click="switchFilterChallenge('success')" class="success-button badge" :class="{active : filters.challenge !== undefined && filters.challenge === 'success'}">
            {{ $t('passed') }}<span>{{ store.last_challenge.nb_success }}</span>
          </button>
          <button @click="switchFilterChallenge('failure')" class="failure-button badge" :class="{active : filters.challenge !== undefined && filters.challenge === 'failure'}">
            {{ $t('failed') }}<span>{{ store.last_challenge.nb_failure }}</span>
          </button>
        </div>
        <button v-if="Object.keys(filters).length || tag_filter.length" class="reset-filters" @click="resetFilters">{{ $t('show_all_characters') }}</button>
        <button class='btn-valid clear-selection' v-if="store.picked_characters !== undefined && store.picked_characters.length" @click="this.store.resetPickedCharacters()">{{ $t('clear_selection') }}</button>
      </div>
      <dataset
          v-slot="{ ds }"
          :ds-data="store.characters"
          :ds-sortby="['-alive', '-challenge', '-connection', 'name']"
          :ds-search-in="['name']"
          :ds-filter-fields="{ tags: filterOnTag, connection: filterConnected, alive: filterDead, challenge: filterChallenge, picked: filterPicked }"
          :ds-sort-as="{ challenge: sortAsChallenge, connection: sortAsConnected }"
          ref="dataset"
      >
        <button @click="this.selectVisible(ds)">{{ $t('add_all_to_selection') }}</button>
        <button ref="step_characters_1" @click="store.generateCharacters(1)">{{ $t('spawn_npc') }}</button>
        <div class="wrapper-label">
          <dataset-search :placeholder="$t('search_character')" v-model="search_character" id="search-character" :ds-search-placeholder="$t('start_typing')" />
        </div>
        <div class="summary full">{{ $t('count_personnage', {count: ds.dsResultsNumber}) }}{{ $t('characters_on') }}{{ store.characters.length }}</div>
        <dataset-item class="full" id="character-list">
          <template #default="{ row, rowIndex }">
            <div @click.exact="animateToCenter(row)" :ref="row.token" :key="row.token" @click.shift.exact="toggleCharacter(row)" @contextmenu.prevent.stop="handleClick($event, row)" class="character" :class="[getClasses(row), !row.alive ? 'dead' : '']">
              <div class="character-names">
                <contenteditable @click.stop v-if="row.editing" class="value" tag="span" contenteditable="true" v-model="row.name" spellcheck="false" :no-nl="true" :no-html="true" />
                <span v-else class="character-name">
                  {{ row.name }}
                </span>
                <contenteditable @click.stop v-if="row.editing" class="value" tag="span" contenteditable="true" v-model="row.pseudo" spellcheck="false" :no-nl="true" :no-html="true" />
                <span v-else class="pseudo">
                  {{ row.pseudo }}
                </span>
              </div>
              <div class="gauges">
                <span v-for="gauge in row.gauges">
                  <span>{{ gauge.label }}</span>
                  <contenteditable @click.stop v-if="row.editing" class="value" tag="span" contenteditable="true" v-model="gauge.value" :no-nl="true" :no-html="true" />
                  <span v-else>{{ gauge.value }}</span>
                </span>
              </div>
              <div class="stats">
                <span v-for="stat in row.stats">
                  <span>{{ stat.label }}</span>
                  <contenteditable @click.stop v-if="row.editing" class="value" tag="span" contenteditable="true" v-model="stat.value" :no-nl="true" :no-html="true" />
                  <span v-else>{{ stat.value }}</span>
                </span>
              </div>
              <div class="tags" v-if="row.tags !== undefined && row.tags.length">
                <span class="tag" v-for="tag in row.tags" :class="'tag-' + tag.code">
                  <span class="label-name">
                    {{ tag.label }}
                  </span>
                </span>
              </div>
            </div>
          </template>
          <template v-slot:noDataFound>
            <div v-if="store.characters.length > 0" class="no-found">{{ $t('no_characters_to_show_try_different_filter') }}</div>
          </template>
        </dataset-item>
      </dataset>
    </div>
  </div>
</template>

<style lang="scss">
  #player-list {
    display: flex;
    flex-direction: column;

    .player {
      border: 1px solid black;
      display: flex;
      flex-direction: column;
    }
  }

  #tab-characters-content {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;

    input:not(.multiselect__input) {
      padding: 0.6em 1.2em;
    }

    span[contenteditable] {
      background: white;
      color: black;
      border-radius: 2px;
      padding: 0 2px;
    }

    .markers-container {
      flex-basis: 100%;
      display: flex;
      justify-content: center;
      gap: 30px;
      font-size: 25px;

      > div {
        display: flex;
        gap: 10px;

        .value {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--button-background);
          color: var(--button-color);
          border-radius: 8px;
          padding: 0 10px;
        }
      }
    }

    .challenge-container {
      display: flex;
      margin: 42px 0;
      flex-basis: 100%;
      align-items: center;

      > .timer-challenge {
        align-self: center;
        flex-shrink: 0;
        background: #d1d5db;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 15px;
        border-left: 1Px solid black;
        font-weight: bold;
      }

      > button {
        align-self: center;
        flex-shrink: 0;
        margin-left: 15px;
      }

      .scale-container {
        position: relative;
        flex: 1;

        &.double-scale {
          margin: 60px 0;
        }

        .slider-base, .slider-connects, .slider-connect {
          border-radius: 0;
        }
        .slider-connect {
          transition: all 1s ease-in-out;
        }
        &.scale-success {
          .slider-connect {
            background: var(--success-background);
          }
        }
        &.scale-neutral {
          .slider-connect {
            background: yellow;
          }
        }
        &.scale-failure {
          .slider-connect {
            background: var(--failure-background);
          }
        }

        .slider-origin {
          display: none;
        }

        > div {
          width: 100%;

          .target-scale {
            position: absolute;
            top: -105%;
            z-index: 1;
            background: var(--font-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--inverse-font-color);
            padding: 0 10px;
            height: 80%;

            &:after {
              content: "";
              background: var(--font-color);
              display: block;
              width: 2px;
              height: 157%;
              position: absolute;
              bottom: -155%;
              left: 0;
            }

            &.validated:before {
              display: flex;
              content: "✅";
              color: green;
              width: 24px;
              height: 24px;
              border-radius: 100%;
              align-items: center;
              justify-content: center;
              margin-right: 3px;
            }

            + .target-scale {
              top: unset;
              bottom: -105%;

              &:after {
                bottom: unset;
                top: -157%;
              }
            }
          }
        }
      }

      .result-container {
        display: flex;
        flex-direction: column;
        margin-left: 15px;
        gap: 6px;
        position: relative;

        > span {
          font-weight: bold;
          position: absolute;
          top: -37px;
          width: 100%;
        }
      }
    }

  }

  .summary {
    text-align: left;
  }

  #character-list {
    flex-basis: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    grid-gap: 3px;
    grid-auto-rows: minmax(100px, auto);
    font-size: 13px;
    word-break: break-word;

    > .character {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 3px 6px 6px 6px;
      border: 1px solid var(--border-color);
      background: var(--background-card-color);
      border-radius: 8px;
      color: var(--font-color);
      user-select: none;
      transition: scale 1s ease, transform 1s ease, opacity 1s ease-in-out;
      transform-origin: top left;

      &.centered {
        opacity: 1 !important;
        z-index: 100;
      }
      &:not(.connected) {
        opacity: 0.6;
      }
      &.picked {
        border: 3px solid var(--character-picked);
      }
      &.result-success {
        background: var(--success-background);
      }
      &.result-failure {
        background: var(--failure-background);
      }
      &.dead {
        position: relative;
        opacity: 0.5;
        &:before {
          content: "💀";
          position: absolute;
          top: 13px;
          bottom: 0;
          left: 0;
          right: 0;
          font-size: 68px;
          opacity: 0.6;
          text-shadow: 7px 12px rgba(0,0,0,0.6);
          transition: all 0.2s ease-in-out;
        }
      }

      > .stats, .gauges {
        display: flex;
        flex-direction: column;
        gap: 1px;

        > span {
          display: flex;
          justify-content: space-between;
        }
      }

      .character-names {
        display: flex;
        flex-direction: column;

        .character-name {
          font-size: 1.2em;
          font-weight: bold;
        }
        .pseudo {
          min-height: 20px;
        }
      }
    }
  }

  .clear-selection {
    margin-left: auto;
  }

  .filter-data {
    display: flex;
    flex: 1;
    gap: 15px;
    flex-direction: row;
    align-items: flex-end;

    > div {
      display: flex;
      flex-direction: column;
    }
  }

  .result-challenge {
    color: yellow;

    &.failure {
      color: var(--failure-background);
    }
    &.success {
      color: var(--success-background);
    }
  }
  .dual-button {
    display: flex;
    flex-direction: row !important;

    > button:first-child {
      border-radius: 8px 0 0 8px;
      border-right: 1px dotted white;
    }
    > button:last-child {
      border-radius: 0 8px 8px 0;
    }
    button.active {
      &.success-button {
        background: var(--success-background) !important;
      }
      &.failure-button {
        background: var(--failure-background) !important;
      }
    }
  }

  .badge {
    position: relative;

    > span {
      position: absolute;
      top: -15px;
      right: 4px;
      border-radius: 8px;
      color: black;
      padding: 5px;
      font-size: 0.7em;
      z-index: 1;
    }

    &.success-button {
      > span {
        background: var(--success-background);;
      }
    }

    &.failure-button {
      > span {
        background: var(--failure-background);;
      }
    }
  }

  .no-found {
    grid-column: 1 / -1;
    font-size: 1rem;
  }

  .tags {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 3px;
    margin-top: auto;

    > .tag {
      border-radius: 10px;
      padding: 1px 5px;
      gap: 2px;
      margin-top: auto;

      .label-name {
        display: flex;
        align-items: center;
        gap: 3px;

        &:before {
          display: block;
          content: "";
          width: 15px;
          height: 15px;
          border-radius:100%;
        }
      }
    }
  }
</style>