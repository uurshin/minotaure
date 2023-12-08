<script>
import { usePlayerStore } from '../main';

export default {
  data() {
    return {
      store: usePlayerStore(),
      change_label_enabled: '',
      change_gauge: '',
      temp_gauge_value: 10,
      add_gauge_enabled: false,
      temp_gauge_name: '',
      add_stat_enabled: false,
      temp_stat_name: '',
      add_marker_enabled: false,
      temp_marker_name: '',
      temp_marker_value: 0,
      temp_gauge_spending: {}
    }
  },
  mounted() {

  },
  methods: {
    createGauge: function() {
      this.add_gauge_enabled = true;
      this.$nextTick(() => {
        this.$refs['temp_gauge'].focus();
      });
    },
    changeGauge: function(key) {
      let label = this.store.gauges[key].name = this.$refs['gauge_' + key][0].value;
      let test_value = parseInt(this.$refs['gauge_value_' + key][0].value);
      let deadly = this.store.gauges[key].deadly = this.$refs['gauge_deadly_' + key][0].checked;
      this.store.gauges[key].value = (deadly && test_value <= 0) ? 1 : test_value;
      this.store.characters.forEach(function(character) {
        character.gauges[key].label = label;
        if (deadly && character.gauges[key].value <= 0 && character.alive) {
          character.gauges[key].value = 1;
        }
      });
      for (const key_stat of Object.keys(this.store.stats)) {
        if (this.$refs['gauge_' + key + '_spending_' + key_stat][0].checked) {
          this.store.gauges[key].spending[key_stat] = this.$refs['gauge_' + key + '_spending_value_' + key_stat][0].value ?? 1;
        }
        else if (this.store.gauges[key].spending[key_stat] !== undefined) {
          delete this.store.gauges[key].spending[key_stat];
        }
      }

      this.change_gauge = '';
    },
    cancelGaugeChange() {
      this.change_gauge = '';
      this.temp_gauge_spending = {};
    },
    openGauge(key) {
      this.change_gauge = key;
      this.$nextTick(() => {
        this.$refs['gauge_' + key][0].focus();
      });
    },
    addGauge: function() {
      let code = Math.floor(Math.random() * 10000000).toString();
      let new_gauge = {
        name: this.temp_gauge_name,
        value: this.temp_gauge_value,
        spending: {}
      };
      this.store.gauges[code] = new_gauge;
      this.store.characters.forEach(function(character) {
        character.gauges[code] = {
          label: new_gauge.name,
          value: new_gauge.value,
          deadly: false,
          spending: {}
        }
      });
      this.add_gauge_enabled = false;
      this.temp_gauge_name = '';
      this.temp_gauge_value = 10;
    },
    hasSpending(gauge, key_stat) {
      return (this.temp_gauge_spending[key_stat] || (this.temp_gauge_spending[key_stat] === undefined && gauge.spending[key_stat] !== undefined && gauge.spending[key_stat] > 0));
    },
    remove: function(key, type) {
      delete this.store[type][key];
      this.store.characters.forEach(function(character) {
        delete character[type][key];
      });
    },
    changeStatLabel: function(key) {
      let label = this.store.stats[key].name = this.$refs['stat_' + key][0].value;
      this.change_label_enabled = '';
      this.store.characters.forEach(function(character) {
        character.stats[key].label = label;
      });
    },
    createStat: function() {
      this.add_stat_enabled = true;
      this.$nextTick(() => {
        this.$refs['temp_stat'].focus();
      });
    },
    addStat: function() {
      let new_stat = {
        name: this.temp_stat_name,
      };
      let code = Math.floor(Math.random() * 10000000).toString();
      this.store.stats[code] = new_stat;
      this.store.characters.forEach(function(character) {
        character.stats[code] = {label: new_stat.name, value: Math.floor(Math.random() * 20) + 1}
      });
      this.add_stat_enabled = false;
      this.temp_stat_name = '';
    },
    createMarker: function() {
      this.add_marker_enabled = true
      this.$nextTick(() => {
        this.$refs['temp_marker'].focus();
      });
    },
    addMarker: function() {
      let code = Math.floor(Math.random() * 10000000).toString();
      this.store.markers[code] = {
        name: this.temp_marker_name,
        value: this.temp_marker_value,
      };
      this.add_marker_enabled = false;
      this.temp_marker_name = '';
    },
    changeMarker: function(key) {
      this.store.markers[key].name = this.$refs['marker_' + key][0].value;
      this.store.markers[key].value = parseInt(this.$refs['marker_value_' + key][0].value);
      this.change_label_enabled = '';
    },
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-settings-content'>
      <div ref="step_settings_gauges" class="wrapper-settings">
        <div class="wrapper-title">
          <h2>{{ $t('bars') }}</h2>
          <button ref="step_settings_add_gauge" class="icon-add btn-valid" v-if="!add_gauge_enabled" @keyup.enter="createGauge()" @click="createGauge()">{{ $t('add') }}</button>
        </div>

        <div class="wrapper-list">
          <template v-for="(gauge, key, index) in store.gauges">
            <div v-if="change_gauge === '' || change_gauge === key" class="gauge list-item" :ref="index === 0 ? 'step_settings_gauge' : null">
              <div v-if="change_gauge !== key" class="wrapper-gauge-title">
                <span class="indicator-name">{{ gauge.name }}</span>
                <span>{{ $t('gauge_start', {gauge_value: gauge.value}) }}</span>
                <span v-if="gauge.deadly">{{ $t('kills_at_0') }}</span>
                <div class="stat-list" v-if="Object.keys(gauge.spending).length">
                  <span>{{ $t('used_for_challenges')}}</span>
                  <span class="stat-list-items">
                    <template v-for="(value, key_stat) in gauge.spending">
                      <span v-if="value" class="stat-list-item">
                      {{ store.stats[key_stat].name }}
                      </span>
                    </template>
                  </span>
                </div>
              </div>
              <div class="action" v-if="change_gauge !== key">
                <button :ref="index === 0 ? 'step_settings_gauge_modify' : null" @keyup.enter="openGauge(key)" @click="openGauge(key)">{{ $t('modify') }}</button>
                <button class="btn-danger" @keyup.enter="remove(key, 'gauges')"  @click="remove(key, 'gauges')" :ref="index === 0 ? 'step_settings_gauge_delete' : null">{{ $t('delete') }}</button>
              </div>
              <template v-else>
                <div class="full">
                  <div class="input-wrapper" :ref="index === 0 ? 'step_settings_gauge_name' : null">
                    <label :for="'gauge_' + key">{{ $t('name') }}</label>
                    <input :ref="'gauge_' + key" :value="gauge.name" :id="'gauge_'+ key" type="text">
                  </div>
                  <button class="btn-valid" @click="changeGauge(key)">{{ $t('submit') }}</button>
                  <button :ref="index === 0 ? 'step_settings_gauge_cancel' : null" @keyup.enter="cancelGaugeChange()" @click="cancelGaugeChange()">{{ $t('cancel') }}</button>
                </div>
                <div :ref="index === 0 ? 'step_settings_gauge_value' : null">
                  <label :for="'gauge_value_'+key">{{ $t('starts_at') }}</label>
                  <input :ref="'gauge_value_' + key" :value="gauge.value" min="1" :id="'gauge_value_'+key" type="number">
                </div>
                <div class="radio-wrapper" :ref="index === 0 ? 'step_settings_gauge_make_deadly' : null">
                  <input :ref="'gauge_deadly_' + key" :checked="gauge.deadly" min="1" :id="'gauge_deadly_'+ key " type="checkbox">
                  <label :for="'gauge_deadly_' + key + '_' + key_stat">{{ $t('gauge_deadly_description') }}</label>
                </div>
                <fieldset class="spending-wrapper" :ref="index === 0 ? 'step_settings_gauge_spending' : null">
                  <legend>{{ $t('spend_on') }}</legend>
                  <div class="radio-wrapper" v-for="(stat, key_stat) in store.stats">
                    <input :id="'gauge_' + key + '_spending_' + key_stat" type="checkbox" :ref="'gauge_' + key + '_spending_' + key_stat" @change="function($event) { temp_gauge_spending[key_stat] = $event.target.checked }" :checked="hasSpending(gauge, key_stat)">
                    <label :for="'gauge_' + key + '_spending_' + key_stat">
                      <strong>{{ stat.name }}</strong>
                    </label>
                    <label :for="'gauge_' + key + '_spending_value_' + key_stat">
                      <span v-if="hasSpending(gauge, key_stat)">{{ $t('spending_diminish') }}</span>
                    </label>
                    <input v-if="hasSpending(gauge, key_stat)" :ref="'gauge_' + key + '_spending_value_' + key_stat" :value="gauge.spending[key_stat] ?? 1" min="1" type="number">
                  </div>
                </fieldset>
              </template>
            </div>
          </template>
          <div class="action-group" v-if="add_gauge_enabled">
            <label for="temp_gauge">{{ $t('name') }}</label>
            <input id="temp_gauge" ref="temp_gauge" type="text" v-model="temp_gauge_name" @keyup.enter="$refs['temp_gauge_value'].focus()">
            <label for="temp_gauge_value">{{ $t('starts_at') }}</label>
            <input id="temp_gauge_value" ref="temp_gauge_value" type="number" min="1" v-model="temp_gauge_value" @keyup.enter="addGauge()">
            <button class="btn-valid" @keyup.enter="addGauge()" @click="addGauge()">{{ $t('submit') }}</button>
            <button @keyup.enter="add_gauge_enabled = false" @click="add_gauge_enabled = false">{{ $t('cancel') }}</button>
          </div>
        </div>
      </div>

      <div ref="step_settings_stats" class="wrapper-settings">
        <div class="wrapper-title">
          <h2>{{ $t('stats') }}</h2>
          <button ref="step_settings_add_stat"  class="icon-add btn-valid" v-if="!add_stat_enabled" @keyup.enter="createStat()" @click="createStat()">{{ $t('add') }}</button>
        </div>
        <div class="wrapper-list">
          <template v-for="(stat, key, index) in store.stats">
            <div class="stat list-item" :ref="index === 0 ? 'step_settings_stat' : null">
              <label class="indicator-name" :for="'stat_' + key" v-if="change_label_enabled !== key">{{ stat.name }}</label>
              <input :ref="'stat_' + key" :value="stat.name" id="'stat_'+key" type="text" v-if="change_label_enabled === key">
              <button class="btn-valid" @click="changeStatLabel(key)" v-if="change_label_enabled === key">{{ $t('submit') }}</button>
              <button @click="change_label_enabled = ''" v-if="change_label_enabled === key">{{ $t('cancel') }}</button>
              <div class="action" v-if="change_label_enabled !== key">
                <button @click="change_label_enabled = key">{{ $t('rename') }}</button>
                <button
                    class="btn-danger"
                    @keyup.enter="remove(key, 'stats')"
                    @click="remove(key, 'stats')"
                    :ref="index === 0 ? 'step_settings_stat_delete' : null">
                    {{ $t('delete') }}
                </button>
              </div>
            </div>
          </template>
          <div class="action-group" v-if="add_stat_enabled">
            <label for="temp_stat">{{ $t('name') }}</label>
            <input @keydown.enter="addStat()" v-model="temp_stat_name" ref="temp_stat" id="temp_stat" type="text">
            <button class="btn-valid" @click="addStat()">{{ $t('submit') }}</button>
            <button @click="add_stat_enabled = false">{{ $t('cancel') }}</button>
          </div>
        </div>
      </div>

      <div ref="step_settings_markers" class="wrapper-settings">
        <div class="wrapper-title">
          <h2>{{ $t('markers') }}</h2>
          <button ref="step_settings_add_marker"  class="icon-add btn-valid" v-if="!add_marker_enabled" @click="createMarker()" @keyup.enter="createMarker()">{{ $t('add') }}</button>
        </div>
        <div class="wrapper-list">
          <template v-for="(marker, key, index) in store.markers">
            <div class="marker list-item" :ref="index === 0 ? 'step_settings_marker' : null">
              <div v-if="change_label_enabled !== key" class="wrapper-marker-title">
                <span class="indicator-name">{{ marker.name }}</span>
                <span>{{ marker.value }}</span>
              </div>
              <input :ref="'marker_' + key" :value="marker.name" :id="'marker_' + key" type="text" v-if="change_label_enabled === key">
              <input :ref="'marker_value_' + key" :value="marker.value" min="1" :id="'marker_value_' + key" type="number" v-if="change_label_enabled === key">
              <button class="btn-valid" @click="changeMarker(key)" v-if="change_label_enabled === key">{{ $t('submit') }}</button>
              <button @click="change_label_enabled = ''" v-if="change_label_enabled === key">{{ $t('cancel') }}</button>
              <div class="action" v-if="change_label_enabled !== key">
                <button @click="change_label_enabled = key">{{ $t('modify') }}</button>
                <button
                    class="btn-danger"
                    @keyup.enter="remove(key, 'markers')"
                    @click="remove(key, 'markers')"
                    :ref="index === 0 ? 'step_settings_marker_delete' : null">
                  {{ $t('delete') }}
                </button>
              </div>
            </div>
          </template>
          <div class="action-group" v-if="add_marker_enabled">
            <label for="temp_marker">{{ $t('name') }}</label>
            <input id="temp_marker" ref="temp_marker" type="text" v-model="temp_marker_name" @keyup.enter="$refs['temp_marker_value'].focus()">
            <label for="temp_marker_value">{{ $t('starts_at') }}</label>
            <input id="temp_marker_value" type="number" min="1" v-model="temp_marker_value" @keyup.enter="addMarker()">
            <button class="btn-valid" @click="addMarker()">{{ $t('submit') }}</button>
            <button @click="add_marker_enabled = false">{{ $t('cancel') }}</button>
          </div>
        </div>
      </div>

      <div ref="step_settings_settings" class="wrapper-settings settings-container" v-if="this.store.settings !== undefined">
        <div class="wrapper-title">
          <h2>{{ $t('settings') }}</h2>
        </div>
        <div class="wrapper-list">
          <div class="list-item">
            <input ref="step_settings_challenge_timer" id="settings-challenge-timer" v-model="this.store.settings.challenge_timer" type="number">
            <label for="settings-challenge-timer">{{ $t('challenge_timer') }} </label>
          </div>
          <div class="list-item radio-wrapper">
            <input ref="step_settings_disconnected_prevent" id="settings-disconnected-prevent" v-model="this.store.settings.disconnected_prevent" type="checkbox">
            <label for="settings-disconnected-prevent">{{ $t('disconnected_prevent') }} </label>
          </div>
          <div class="list-item radio-wrapper">
            <input ref="step_settings_npc_prevent" id="settings-npc-prevent" v-model="this.store.settings.npc_prevent" type="checkbox">
            <label for="settings-npc-prevent">{{ $t('npc_prevent') }}</label>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style lang="scss" scoped>
  #tab-settings-content {
    flex-direction: row;
    flex-wrap: wrap;

    display: grid;
    grid-template-columns: 1fr 1fr;

    @include media("<=laptop") {
      display: flex;
    }
  }
  .wrapper-settings {
    gap: 15px;
    display: flex;
    flex-direction: row;
    flex: 1 1 40%;
    background: var(--background-card-color);
    padding: 30px;
    flex-wrap: wrap;
    align-items: center;
    align-content: flex-start;

    input {
      align-self: stretch;
    }
    input[type=number] {
      max-width: 60px;
      min-height: 40px;
    }

    &.settings-container {
      label {
        margin-right: auto;
      }
    }
  }

  h2 {
    margin: 0;
  }
  .wrapper-title {
    display: flex;
    flex-basis: 100%;
    justify-content: space-between;
    margin-bottom: 30px;
  }
  .wrapper-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    flex: 1;
  }
  .wrapper-gauge-title {
    display: flex;
    flex-wrap: wrap;
    flex: 1;
    text-align: left;
    align-items: center;
    gap: 0 10px;

    .action {
      ~ span, div {
        flex-basis: 100%;
      }
    }

    > span:not(.gauge-name),
    .stat-list {
      font-size: 0.9em;
    }

    .stat-list {
      > span:first-child {
        margin-right: 5px;
      }
      .stat-list-items {
        .stat-list-item:not(:first-child) {
          &:before {
            content: ' - ';
          }
        }
      }
    }
  }
  .wrapper-marker-title {
    display: flex;
    gap: 10px;
  }

  .input-wrapper {
    align-items: center;
    display: flex;
    gap: 10px;
    align-self: stretch;
  }

  .list-item {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;

    .spending-wrapper {
      flex-basis: 100%;
      display: flex;
      flex-direction: column;
      gap: 15px;

      > div {
        gap: 5px;
        align-items: center;

        input[type=number] {
          min-height: auto;
        }
      }
    }

    &.gauge {
      > div {
        display: flex;
        gap: 10px;
        align-items: center;
      }
    }
  }

  .action {
    margin-left: auto;
    display: flex;
    gap: 10px;
  }
  .action-group {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;

    button:first-of-type {
      margin-left: auto;
    }
  }

  .temp-stat-group {
    display: flex;
    gap: 15px;
  }

  .list-item {
    flex-basis: 100%;
    justify-content: space-between;

    &:first-of-type {
      margin-top: auto;
    }

    button {
      white-space: nowrap;
    }

    .btn-valid {
      margin-left: auto;
    }
  }

  .indicator-name {
    font-weight: bold;
  }
</style>
