<script>
import router, { usePlayerStore } from '../main';
import 'vue-simple-context-menu/dist/vue-simple-context-menu.css';

export default {
  data() {
    const store = usePlayerStore();
    const stats_input = [];
    const change_label_enabled = [];
    const add_stat_enabled = false;
    const temp_stat_name = '';

    return {
      store, stats_input, change_label_enabled, add_stat_enabled, temp_stat_name
    }
  },
  methods: {
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
    <div id='tab-stats-content'>
      <div class="actions">
        <button class="icon-add" v-if="!add_stat_enabled" @click="add_stat_enabled = true">Ajouter une caractéristique</button>
      </div>
      <template v-for="(stat, key) in store.stats">
        <div class="stat list-item">
          <label :for="'stat_' + key" v-if="!change_label_enabled[key]">{{ stat.name }}</label>
          <input :ref="'stat_' + key" :value="stat.name" id="'stat_'+key" type="text" v-if="change_label_enabled[key]">
          <button @click="changeStatLabel(key)" v-if="change_label_enabled[key]">Valider</button>
          <button @click="change_label_enabled[key] = false" v-if="change_label_enabled[key]">Annuler</button>
          <div class="action">
            <button @click="change_label_enabled[key] = true" v-if="!change_label_enabled[key]">Changer le nom</button>
            <button @click="removeStat(key)" v-if="!change_label_enabled[key]">Supprimer</button>
          </div>
        </div>
      </template>
      <div class="action-group" v-if="add_stat_enabled">
        <input @keyup.enter="addStat()" placeholder="Nom de la caractéristique" v-model="temp_stat_name" id="temp_stat" type="text">
        <button @click="addStat()">Valider</button>
        <button @click="add_stat_enabled = false">Annuler</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  #tab-stats-content {
    .temp-stat-group {
      display: flex;
      gap: 15px;
    }
  }
</style>