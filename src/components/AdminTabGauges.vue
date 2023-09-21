<script>
import router, { usePlayerStore } from '../main';
import { ref } from 'vue'

export default {
  data() {
    const store = usePlayerStore();
    const gauges_input = [];
    const change_label_enabled = [];
    const add_gauge_enabled = false;
    const temp_gauge_name = '';
    const temp_gauge_value = 10;

    return {
      store, gauges_input, change_label_enabled, add_gauge_enabled, temp_gauge_name, temp_gauge_value
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
        delete character.gauges.key;
      });
    },
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-gauges-content'>
      <div class="actions">
        <button ref="step2" class="icon-add" v-if="!add_gauge_enabled" @click="add_gauge_enabled = true">Ajouter une jauge</button>
      </div>
      <template v-for="(gauge, key) in store.gauges">
        <div class="gauge list-item">
          <label :for="'gauge_' + key" v-if="!change_label_enabled[key]">{{ gauge.name }}</label>
          <span v-if="!change_label_enabled[key]">- démarre à {{ gauge.value }}</span>
          <span v-if="gauge.deadly && !change_label_enabled[key]">- meurt à 0</span>
          <input :ref="'gauge_' + key" :value="gauge.name" id="'gauge_'+key" type="text" v-if="change_label_enabled[key]">
          <input :ref="'gauge_value_' + key" :value="gauge.value" min="1" id="'gauge_value'+key" type="number" v-if="change_label_enabled[key]">
          <button @click="changeGauge(key)" v-if="change_label_enabled[key]">Valider</button>
          <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">Annuler</button>
          <div class="action">
            <button @click="makeDeadly(key)" v-if="!change_label_enabled[key]">{{ gauge.deadly ?  'Rendre non-léthale' : 'Rendre léthale' }}</button>
            <button @click="change_label_enabled[key] = true" v-if="!change_label_enabled[key]">Modifier</button>
            <button @click="removeGauge(key)" v-if="!change_label_enabled[key]">Supprimer</button>
          </div>
        </div>
      </template>
      <div class="action-group" v-if="add_gauge_enabled">
        <label for="temp_gauge">Nom</label>
        <input id="temp_gauge" type="text" v-model="temp_gauge_name" @keyup.enter="addGauge()">
        <label for="temp_gauge_value">Valeur de départ</label>
        <input id="temp_gauge_value" type="number" min="1" v-model="temp_gauge_value">
        <button @click="addGauge()">Valider</button>
        <button @click="add_gauge_enabled = false">Annuler</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">

</style>