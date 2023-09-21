<script>
import router, { usePlayerStore } from '../main';
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
    <div id='tab-intro-content'>
      TOto
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>