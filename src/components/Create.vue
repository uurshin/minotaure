<script>
import router from '../main.js'
import { usePlayerStore } from '../main';

import { Peer } from "peerjs";

export default {
  data() {
    const store = usePlayerStore();
    return {
      store,
      peer: '',
      connections: [],
      id_admin: '',
      name: '',
      step: 0
    }
  },
  computed: {
    isBtnDisabled() {
      if (this.name.length === 0) return -1;
      else if (this.id_admin === '') return 0;
      return 1;
    },
    textBtn() {
      if (this.name.length === 0) {
        return this.$t('waiting_name');
      }
      else if (this.id_admin === '') {
        return this.$t('please_wait');
      }
      return this.$t('start_game');
    }
  },
  mounted() {
    this.ask_id();
  },
  methods: {
    ask_id() {
      const vm = this;
      if (this.step === 0) {
        this.step = 1;

        let peer = new Peer(null, this.store.getPeerOptions());
        peer.once('open', function () {
          vm.store.setPeer(peer);
          vm.id_admin = peer.id;
        });
      }
      else {
        this.launch();
      }
    },
    launch() {
      const vm = this;

      // Store the game in the local storage of the browser.
      let games_storage = localStorage.getItem('games');
      games_storage = (games_storage == null ? [] : JSON.parse(games_storage));
      let new_game = {
        id: Date.now(),
        name: this.name,
        characters: [],
        date: Date.now(),
        version: APP_VERSION,
        init: true,
        tag_groups: []
      };
      games_storage.push(new_game);
      this.store.setCurrentGame(new_game);
      this.store.current_game.initialized = false;
      this.store.current_game.tuto_on = true;
      this.store.current_game.game_started = false;
      localStorage.setItem('games', JSON.stringify(games_storage));
      localStorage.removeItem('temp_game');

      // Open the webrtc connection.
      if (this.id_admin !== '') {
        router.push('/admin');
      }
    },
  },
}
</script>

<template>
  <h1>{{ $t("game_create") }}</h1>
  <div class="small-wrapper menu-wrapper">
    <label for="name">{{ $t("game_name_invite") }}</label>
    <input @keyup.enter="$refs['btn_start'].focus()" autocomplete="off" v-model="name" type="text" id="name" value="Ma partie" :placeholder="$t('my_game')" maxlength="25">
<!--    <label v-if="step === 1" for="id_admin">{{ $t("game_id_help") }}</label>-->
<!--    <input v-if="step === 1" type="text" ref="id_admin" v-model="id_admin" id="id_admin" @keyup.enter="launch">-->
    <button ref="btn_start" class="btn-valid" :disabled="isBtnDisabled !== 1" @click="ask_id" @keyup.enter="ask_id">{{ textBtn }}</button>
  </div>
</template>

<style scoped lang="scss">
 #id_admin {
    padding: 10px;
    text-align: center;
    border-radius: 10px;
    font-size: 0.9em;
    flex: 1;

    @include media("<tablet") {
      flex-basis: 100%;
      font-size: 0.9em;
    }
  }
</style>



