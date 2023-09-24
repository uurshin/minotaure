<script>
import { usePlayerStore } from '../main';
import VueMultiselect from 'vue-multiselect'
import {Dataset, DatasetItem, DatasetSearch, DatasetInfo, DatasetShow} from "vue-dataset";
import VueSimpleContextMenu from 'vue-simple-context-menu';
import {useI18n} from "vue-i18n";

export default {
  components: {
    VueMultiselect,
    Dataset,
    DatasetItem,
    DatasetSearch,
    DatasetInfo,
    DatasetShow,
    VueSimpleContextMenu
  },
  data() {
    const store = usePlayerStore();
    const { t } = useI18n();

    return {
      store,
      t,
      tag_filter: [],
      search_character: '',
      filters: {},
      options_contextual: [{}]
    }
  },
  mounted() {
    this.$refs['dataset'].showEntries(10000);
  },
  methods: {
    getClasses(character) {
      let classes = [];
      if (character.challenge !== undefined && character.challenge.date === this.store.last_challenge.date) {
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
    filterDead(dead) {
      if (this.filters['dead'] !== undefined) {
        return dead;
      }
      return true;
    },
    filterChallenge(challenge) {
      if (this.filters['challenge'] !== undefined) {
        console.log('challenge defined');
        if (challenge !== undefined && challenge.date === this.store.last_challenge.date) {
          return challenge.result === this.filters['challenge'];
        }
      }
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
      return (challenge !== undefined && challenge.date === this.store.last_challenge.date);
    },
    sortAsConnected(connection) {
      return (
          connection !== null &&
          this.store.connections[connection] !== undefined &&
          this.store.connections[connection].open === true
      )
    },
    handleClick (event, item) {
      this.options_contextual = this.generateOptions(item)
      this.$refs.context_character.showMenu(event, item)
    },
    generateOptions (item) {
      let options = [];
      options.push({ name: 'Renommer (à venir)', effect:'rename'});
      options.push({ name: 'Supprimer (à venir)', effect:'rename'});
      options.push({ name: 'Modifier (à venir)', effect:'rename'});
      options.push({ type:'divider'})
      return options;
    },
    optionClicked (event) {
      if (event.option.effect !== undefined) {
        let character = event.item;
        switch (event.option.effect) {
          case 'rename':
            console.log(character.character_token);
        }
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
  <div class="tab" ref="tab">
    <div id='tab-characters-content'>
      <div class="full" v-if="this.store.last_challenge.date !== 0">
        <span>{{ t('La dernière épreuve a connu un pourcentage de réussite de') }}
          <span class="result-challenge" :class="store.last_challenge.rate <= 50 ? (store.last_challenge.rate < 50 ? 'failure' : '') : 'success'">{{ store.last_challenge.rate}}%</span>
        </span>
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
              placeholder="Choisir un tag"
              tagPlaceholder="Choisir un tag"
              noOptions="Tout le monde"
              :options=store.tag_groups
              :multiple="true"
              :taggable="false"
              :hideSelected="true"
          ></vue-multiselect>
        </div>
        <button @click="switchFilter('dead')" :class="{active : filters.dead !== undefined}">{{ t('Vivants') }}</button>
        <button @click="switchFilter('connected')" :class="{active : filters.connected !== undefined}">{{ t('Connectés') }}</button>
        <div class="dual-button" v-if="store.last_challenge.date !== 0">
          <button @click="switchFilterChallenge('success')" class="success-button badge" :class="{active : filters.challenge !== undefined && filters.challenge === 'success'}">
            Réussites<span>{{ store.last_challenge.nb_success }}</span>
          </button>
          <button @click="switchFilterChallenge('failure')" class="failure-button badge" :class="{active : filters.challenge !== undefined && filters.challenge === 'failure'}">
            Échecs<span>{{ store.last_challenge.nb_failure }}</span>
          </button>
        </div>

        <button v-if="Object.keys(filters).length || tag_filter.length" class="reset-filters" @click="resetFilters">{{ t('Montrer tous les personnages') }}</button>
      </div>
      <dataset
          v-slot="{ ds }"
          :ds-data="store.characters"
          :ds-sortby="['-alive', '-challenge', '-connection', 'name']"
          :ds-search-in="['name']"
          :ds-filter-fields="{ tags: filterOnTag, connection: filterConnected, alive: filterDead, challenge: filterChallenge }"
          :ds-sort-as="{ challenge: sortAsChallenge, connection: sortAsConnected }"
          ref="dataset"
      >
        <button ref="step2" @click="store.generateCharacters(1)">{{ t('Générer un PNJ') }}</button>
        <div class="wrapper-label">
          <dataset-search :placeholder="$t('Rechercher un personnage')" v-model="search_character" id="search-character" :ds-search-placeholder="$t('Commencez à taper')" />
        </div>
        <div class="summary full">{{ t('count_personnage', {count: ds.dsResultsNumber}) }}{{ t('sur') }}{{ store.characters.length }}</div>
        <dataset-item class="full" id="character-list">
          <template #default="{ row, rowIndex }" >
            <div @contextmenu.prevent.stop="handleClick($event, row)" class="character" :class="[getClasses(row), !row.alive ? 'dead' : '']">
              <span class="character-name">{{ row.name }}</span>
              <div class="gauges">
                <span v-for="gauge in row.gauges"><span>{{ gauge.label }}</span><span>{{ gauge.value }}</span></span>
              </div>
              <div class="stats">
                <span v-for="stat in row.stats"><span>{{ stat.label }}</span><span>{{ stat.value }}</span></span>
              </div>
              <div class="tags">
                <span class="tag" v-for="tag in row.tags" :class="'tag-' + tag.code">
                  <span class="label-name">
                    {{ tag.label }}
                  </span>
                </span>
              </div>
            </div>
          </template>
          <template v-slot:noDataFound>
            <div v-if="store.characters.length > 0" class="no-found">{{ t('Aucun personnage ne correspond à ces filtres') }}</div>
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
    align-items: center;
    justify-content: space-between;

    input:not(.multiselect__input) {
      height: 40px;
      padding: 0 10px;
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
      gap: 3px;
      padding: 3px 6px 6px 6px;
      border: 1px solid var(--border-color);
      background: var(--background-color);
      border-radius: 8px;
      color: var(--font-color);

      &:not(.connected) {
        background: none;
        opacity: 0.6;
      }
      &.result-success {
        background: var(--success-background);
      }
      &.result-failure {
        background: var(--failure-background);
      }
      &.dead {
        opacity: 0.5;
        &:before {
          content:"💀";
        }
      }

      > .stats, .gauges {
        display: flex;
        flex-direction: column;

        > span {
          display: flex;
          justify-content: space-between;
        }
      }

      .character-name {
        font-size: 1.2em;
        font-weight: bold;
        margin-bottom: 10px;
      }
    }
  }

  .filter-data {
    display: flex;
    gap: 15px;
    flex-direction: row;
    align-items: flex-end;
    margin-right: auto;

    > div {
      display: flex;
      flex-direction: column;
    }

    .reset-filters {
      margin-left: auto;
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
        background: var(--success-background);
      }
      &.failure-button {
        background: var(--failure-background);
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
    gap: 3px;
    margin-top: auto;

    > .tag {
      border-radius: 10px;
      padding: 1px 5px;

      display: flex;
      align-items: center;
      gap: 2px;
      justify-content: center;

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

  #tag_filter {
    font-size: 1em;
    min-width: 125px;
  }
</style>