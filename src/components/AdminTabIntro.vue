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
      {{ $t('Bienvenue dans Minotaure')}}
      {{ $t("Vous pouvez démarrer le didacticiel à tout moment en cliquant sur le bouton d'aide")}}
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>