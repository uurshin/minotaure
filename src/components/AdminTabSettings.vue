<script>
import { usePlayerStore } from '../main';

export default {
  data() {
    const store = usePlayerStore();
    const change_label_enabled = [];
    const add_gauge_enabled = false;
    const temp_gauge_name = '';
    const temp_gauge_value = 10;

    const add_stat_enabled = false;
    const temp_stat_name = '';

    const add_marker_enabled = false;
    const temp_marker_name = '';
    const temp_marker_value = 0;

    return {
      store,
      change_label_enabled,
      add_gauge_enabled,
      temp_gauge_name,
      temp_gauge_value,
      add_stat_enabled,
      temp_stat_name,
      add_marker_enabled,
      temp_marker_name,
      temp_marker_value
    }
  },
  mounted() {

  },
  methods: {
    changeGauge: function(key) {
      let label = this.store.gauges[key].name = this.$refs['gauge_' + key][0].value;
      let test_value = parseInt(this.$refs['gauge_value_' + key][0].value);
      let value = this.store.gauges[key].value = (test_value > 0 ? test_value : 1);
      this.store.characters.forEach(function(character) {
        character.gauges[key].label = label;
        if (character.gauges[key].value > value) {
          character.gauges[key].value = value;
        }
      });
      this.change_label_enabled[key] = false;
    },
    makeDeadly: function(key) {
      let deadly = this.store.gauges[key].deadly = !this.store.gauges[key].deadly;
      if (deadly) {
        this.store.characters.forEach(function(character) {
          if (character.gauges[key].value <= 0) {
            character.alive = false;
          }
        });
      }
      this.change_label_enabled[key] = false;
    },
    addGauge: function() {
      let code = Math.floor(Math.random() * 10000000).toString();
      let new_gauge = {
        name: this.temp_gauge_name,
        value: this.temp_gauge_value > 0 ? this.temp_gauge_value : 1,
      };
      this.store.gauges[code] = new_gauge;
      this.store.characters.forEach(function(character) {
        character.gauges[code] = {
          label: new_gauge.name,
          value: new_gauge.value,
          deadly: false
        }
      });
      this.add_gauge_enabled = false;
      this.temp_gauge_name = '';
    },
    remove: function(key, type) {
      delete this.store[type][key];
      this.store.characters.forEach(function(character) {
        delete character[type][key];
      });
    },
    changeStatLabel: function(key) {
      let label = this.store.stats[key].name = this.$refs['stat_' + key][0].value;
      this.change_label_enabled[key] = false;
      this.store.characters.forEach(function(character) {
        character.stats[key].label = label;
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
      this.change_label_enabled[key] = false;
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
          <button ref="step_settings_add_gauge" class="icon-add btn-valid" v-if="!add_gauge_enabled" @click="add_gauge_enabled = true">{{ $t('add') }}</button>
        </div>
        <div class="wrapper-list">
          <template v-for="(gauge, key, index) in store.gauges">
            <div class="gauge list-item" :ref="index === 0 ? 'step_settings_gauge' : null">
              <div v-if="!change_label_enabled[key]" class="wrapper-gauge-title">
                <span class="gauge-name">{{ gauge.name }}</span>
                <span>{{ $t('gauge_start', {gauge_value: gauge.value}) }}</span>
                <span v-if="gauge.deadly">{{ $t('kills_at_0') }}</span>
              </div>
              <input :ref="'gauge_' + key" :value="gauge.name" id="'gauge_'+key" type="text" v-if="change_label_enabled[key]">
              <input :ref="'gauge_value_' + key" :value="gauge.value" min="1" id="'gauge_value'+key" type="number" v-if="change_label_enabled[key]">
              <button class="btn-valid" @click="changeGauge(key)" v-if="change_label_enabled[key]">{{ $t('submit') }}</button>
              <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">{{ $t('cancel') }}</button>
              <div class="action" v-if="!change_label_enabled[key]">
                <button @click="makeDeadly(key)" :ref="index === 0 ? 'step_settings_gauge_make_deadly' : null">{{ gauge.deadly ? $t('make_normal') : $t('make_fatal') }}</button>
                <button @click="change_label_enabled[key] = true">{{ $t('modify') }}</button>
                <button class="btn-danger" @keyup.enter="remove(key, 'gauges')"  @click="remove(key, 'gauges')" :ref="index === 0 ? 'step_settings_gauge_delete' : null">{{ $t('delete') }}</button>
              </div>
            </div>
          </template>
          <div class="action-group" v-if="add_gauge_enabled">
            <label for="temp_gauge">{{ $t('name') }}</label>
            <input id="temp_gauge" type="text" v-model="temp_gauge_name" @keyup.enter="addGauge()">
            <label for="temp_gauge_value">{{ $t('starts_at') }}</label>
            <input id="temp_gauge_value" type="number" min="1" v-model="temp_gauge_value">
            <button class="btn-valid" @click="addGauge()">{{ $t('submit') }}</button>
            <button @click="add_gauge_enabled = false">{{ $t('cancel') }}</button>
          </div>
        </div>
      </div>

      <div ref="step_settings_stats" class="wrapper-settings">
        <div class="wrapper-title">
          <h2>{{ $t('stats') }}</h2>
          <button ref="step_settings_add_stat"  class="icon-add btn-valid" v-if="!add_stat_enabled" @click="add_stat_enabled = true">{{ $t('add') }}</button>
        </div>
        <div class="wrapper-list">
          <template v-for="(stat, key, index) in store.stats">
            <div class="stat list-item" :ref="index === 0 ? 'step_settings_stat' : null">
              <label :for="'stat_' + key" v-if="!change_label_enabled[key]">{{ stat.name }}</label>
              <input :ref="'stat_' + key" :value="stat.name" id="'stat_'+key" type="text" v-if="change_label_enabled[key]">
              <button class="btn-valid" @click="changeStatLabel(key)" v-if="change_label_enabled[key]">{{ $t('submit') }}</button>
              <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">{{ $t('cancel') }}</button>
              <div class="action">
                <button @click="change_label_enabled[key] = true" v-if="!change_label_enabled[key]">{{ $t('rename') }}</button>
                <button
                    class="btn-danger"
                    @keyup.enter="remove(key, 'stats')"
                    @click="remove(key, 'stats')"
                    v-if="!change_label_enabled[key]"
                    :ref="index === 0 ? 'step_settings_stat_delete' : null">
                    {{ $t('delete') }}
                </button>
              </div>
            </div>
          </template>
          <div class="action-group" v-if="add_stat_enabled">
            <label for="temp_stat">{{ $t('name') }}</label>
            <input @keyup.enter="addStat()" v-model="temp_stat_name" id="temp_stat" type="text">
            <button class="btn-valid" @click="addStat()">{{ $t('submit') }}</button>
            <button @click="add_stat_enabled = false">{{ $t('cancel') }}</button>
          </div>
        </div>
      </div>

      <div ref="step_settings_markers" class="wrapper-settings">
        <div class="wrapper-title">
          <h2>{{ $t('markers') }}</h2>
          <button ref="step_settings_add_marker"  class="icon-add btn-valid" v-if="!add_marker_enabled" @click="add_marker_enabled = true">{{ $t('add') }}</button>
        </div>
        <div class="wrapper-list">
          <template v-for="(marker, key, index) in store.markers">
            <div class="marker list-item" :ref="index === 0 ? 'step_settings_marker' : null">
              <div v-if="!change_label_enabled[key]" class="wrapper-marker-title">
                <span class="marker-name">{{ marker.name }}</span>
                <span>{{ marker.value }}</span>
              </div>
              <input :ref="'marker_' + key" :value="marker.name" id="'marker_'+key" type="text" v-if="change_label_enabled[key]">
              <input :ref="'marker_value_' + key" :value="marker.value" min="1" id="'marker_value'+key" type="number" v-if="change_label_enabled[key]">
              <button class="btn-valid" @click="changeMarker(key)" v-if="change_label_enabled[key]">{{ $t('submit') }}</button>
              <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">{{ $t('cancel') }}</button>
              <div class="action">
                <button @click="change_label_enabled[key] = true" v-if="!change_label_enabled[key]">{{ $t('modify') }}</button>
                <button
                    class="btn-danger"
                    @keyup.enter="remove(key, 'markers')"
                    @click="remove(key, 'markers')"
                    v-if="!change_label_enabled[key]"
                    :ref="index === 0 ? 'step_settings_marker_delete' : null">
                  {{ $t('delete') }}
                </button>
              </div>
            </div>
          </template>
          <div class="action-group" v-if="add_marker_enabled">
            <label for="temp_marker">{{ $t('name') }}</label>
            <input id="temp_marker" type="text" v-model="temp_marker_name" @keyup.enter="addMarker()">
            <label for="temp_marker_value">{{ $t('starts_at') }}</label>
            <input id="temp_marker_value" type="number" min="1" v-model="temp_marker_value">
            <button class="btn-valid" @click="addMarker()">{{ $t('submit') }}</button>
            <button @click="add_marker_enabled = false">{{ $t('cancel') }}</button>
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
  }
  .wrapper-settings {
    gap: 15px;
    display: flex;
    flex-direction: row;
    flex: 1;
    background: var(--background-card-color);
    padding: 30px;
    flex-wrap: wrap;
    align-items: center;
    align-content: flex-start;

    input[type=number] {
      max-width: 60px;
      height: 40px;
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
    text-align: left;
    gap: 0 10px;

    .gauge-name {
      font-weight: bold;
      flex-basis: 100%;
    }

    span:not(.gauge-name) {
      font-size: 0.9em;
    }
  }
  .wrapper-marker-title {
    display: flex;
    gap: 10px;

    .marker-name {
      font-weight: bold;
    }
  }

  .list-item {
    display: flex;
    gap: 10px;
    align-items: center;
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

    input {
      align-self: stretch;
    }
    button {
      white-space: nowrap;
    }

    .btn-valid {
      margin-left: auto;
    }
  }
</style>
