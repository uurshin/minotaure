<script>
import router, { usePlayerStore } from '../main';
import VueMultiselect from "vue-multiselect";
import {useI18n} from "vue-i18n";

export default {
  components: {
    VueMultiselect
  },
  data() {
    const store = usePlayerStore();
    const { t } = useI18n();
    const pick_multiselect = [];
    const type_pick = 'all'
    const nb_targets = 1;

    return {
      store, t, pick_multiselect, type_pick, nb_targets
    }
  },
  mounted() {

  },
  methods: {
    launchPick: function() {

    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-pick-content'>
      <input type="number" v-model="nb_targets" min=1>
      <select v-model="type_pick">
        <option value="all">Parmi les personnages ayant un de ces tags :</option>
        <option value="all">Parmi les personnages ayant tous ces tags :</option>
        <option value="each">{{ nb_targets }} personnages par tag :</option>
      </select>
      <vue-multiselect
          ref="pick_multiselect"
          id="pick_multiselect"
          v-model="pick_multiselect"
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
      <button @click="launchPick">{{ t('Lancer le tirage') }}</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  #tab-pick-content {
    flex-direction: row;
  }
</style>