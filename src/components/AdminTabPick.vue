<script>
import router, { usePlayerStore } from '../main';
import { ref } from 'vue'
import VueMultiselect from "vue-multiselect";
import {Dataset, DatasetInfo, DatasetItem, DatasetSearch, DatasetShow} from "vue-dataset";
import {useI18n} from "vue-i18n";

export default {
  components: {

  },
  data() {
    const store = usePlayerStore();
    const { t } = useI18n();

    return {
      store, t
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
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>