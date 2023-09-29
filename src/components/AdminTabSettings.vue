<script>
import router, { usePlayerStore } from '../main';
import { ref } from 'vue'
import {useI18n} from "vue-i18n";

export default {
  data() {
    const store = usePlayerStore();
    const { t } = useI18n();
    const change_label_enabled = [];
    const add_gauge_enabled = false;
    const temp_gauge_name = '';
    const temp_gauge_value = 10;

    const add_stat_enabled = false;
    const temp_stat_name = '';

    return {
      store, t, change_label_enabled, add_gauge_enabled, temp_gauge_name, temp_gauge_value, add_stat_enabled, temp_stat_name
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
          console.log(character.gauges[key].value);
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
    removeGauge: function(key) {
      delete this.store.gauges[key];
      this.store.characters.forEach(function(character) {
        delete character.gauges[key];
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
    removeStat: function(key) {
      delete this.store.stats[key];
      this.store.characters.forEach(function(character) {
        delete character.stats[key];
      })
    },
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-settings-content'>
      <div class="wrapper-settings">
        <h2>{{ t('Caractéristiques') }}</h2>
        <button ref="step3" class="icon-add" v-if="!add_gauge_enabled" @click="add_gauge_enabled = true">{{ t('Ajouter') }}</button>
        <template v-for="(gauge, key) in store.gauges">
          <div class="gauge list-item">
            <label :for="'gauge_' + key" v-if="!change_label_enabled[key]">{{ gauge.name }}</label>
            <span v-if="!change_label_enabled[key]">{{ t('gauge_start', {gauge_value: gauge.value}) }}</span>
            <span v-if="gauge.deadly && !change_label_enabled[key]">{{ t('meurt à 0') }}</span>
            <input :ref="'gauge_' + key" :value="gauge.name" id="'gauge_'+key" type="text" v-if="change_label_enabled[key]">
            <input :ref="'gauge_value_' + key" :value="gauge.value" min="1" id="'gauge_value'+key" type="number" v-if="change_label_enabled[key]">
            <button @click="changeGauge(key)" v-if="change_label_enabled[key]">{{ t('Valider') }}</button>
            <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">{{ t('Annuler') }}</button>
            <div class="action">
              <button @click="makeDeadly(key)" v-if="!change_label_enabled[key]">{{ gauge.deadly ? t('Rendre non-létale') : t('Rendre létale') }}</button>
              <button @click="change_label_enabled[key] = true" v-if="!change_label_enabled[key]">{{ t('Modifier') }}</button>
              <button @click="removeGauge(key)" v-if="!change_label_enabled[key]">{{ t('Supprimer') }}</button>
            </div>
          </div>
        </template>
        <div class="action-group" v-if="add_gauge_enabled">
          <label for="temp_gauge">{{ t('Nom') }}</label>
          <input id="temp_gauge" type="text" v-model="temp_gauge_name" @keyup.enter="addGauge()">
          <label for="temp_gauge_value">{{ t('Valeur de départ') }}</label>
          <input id="temp_gauge_value" type="number" min="1" v-model="temp_gauge_value">
          <button @click="addGauge()">{{ t('Valider') }}</button>
          <button @click="add_gauge_enabled = false">{{ t('Annuler') }}</button>
        </div>
      </div>

      <div class="wrapper-settings">
        <h2>{{ t('Caractéristiques') }}</h2>
        <button class="icon-add" v-if="!add_stat_enabled" @click="add_stat_enabled = true">{{ t('Ajouter') }}</button>
        <template v-for="(stat, key) in store.stats">
          <div class="stat list-item">
            <label :for="'stat_' + key" v-if="!change_label_enabled[key]">{{ stat.name }}</label>
            <input :ref="'stat_' + key" :value="stat.name" id="'stat_'+key" type="text" v-if="change_label_enabled[key]">
            <button @click="changeStatLabel(key)" v-if="change_label_enabled[key]">{{ t('Valider') }}</button>
            <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">{{ t('Annuler') }}</button>
            <div class="action">
              <button @click="change_label_enabled[key] = true" v-if="!change_label_enabled[key]">{{ t('Changer le nom') }}</button>
              <button @click="removeStat(key)" v-if="!change_label_enabled[key]">{{ t('Supprimer') }}</button>
            </div>
          </div>
        </template>
        <div class="action-group" v-if="add_stat_enabled">
          <input @keyup.enter="addStat()" :placeholder="$t('Nom de la caractéristique')" v-model="temp_stat_name" id="temp_stat" type="text">
          <button @click="addStat()">{{ t('Valider') }}</button>
          <button @click="add_stat_enabled = false">{{ t('Annuler') }}</button>
        </div>
      </div>

    </div>
  </div>
</template>

<style lang="scss">
  .wrapper-settings {
    gap: 15px;
    display: flex;
    flex-direction: row;
    flex: 1;
    background: #222;
    padding: 30px;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
  }

  .temp-stat-group {
    display: flex;
    gap: 15px;
  }
</style>
