<script>
import router, { usePlayerStore } from '../main';


export default {
  components: {

  },
  data() {
    const store = usePlayerStore();

    return {
      store
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
      {{ $t('minotaure_welcome')}}
      {{ $t("tutorial_help")}}
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>