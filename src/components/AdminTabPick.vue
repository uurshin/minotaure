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
    const nb_targets = 0;

    return {
      store, t, pick_multiselect, type_pick, nb_targets
    }
  },
  mounted() {

  },
  methods: {

  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-pick-content'>
      <input type="number" v-model="nb_targets">
      <select v-model="type_pick">
        <option value="all">Parmi les personnages ayant un de ces tags :</option>
        <option value="all">Parmi les personnages ayant tous ces tags :</option>
        <option value="each">Pour chaque tag ({{ nb_targets }} par tag) :</option>
      </select>
      <vue-multiselect
          ref="pick_multiselect"
          id="pick_multiselect"
          v-model="pick_multiselect"
          label="label"
          track-by="code"
          placeholder="Choisir un tag"
          tagPlaceholder="Choisir un tag"
          noOptions="Tout le monde"
          :options=store.tags
          :multiple="true"
          :taggable="false"
          :hideSelected="true"
      ></vue-multiselect>
    </div>
  </div>
</template>

<style scoped lang="scss">
  #tab-pick-content {
    flex-direction: row;
  }
</style>