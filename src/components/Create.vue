<script>
import router from '../main.js'
import { usePlayerStore } from '../main';
import {useI18n} from "vue-i18n";

export default {
  setup() {
    const { t } = useI18n()
    return { t };
  },
  data() {
    const store = usePlayerStore();
    return {
      store,
      peer: '',
      connections: [],
      id_admin: '',
      name: '',
      btn_text: 'En attente',
      step: 0
    }
  },
  computed: {
    isBtnDisabled() {
      if (this.step === 0) {
        if (this.name.length === 0) {
          this.btn_text =  'En attente';
          return true;
        }
        else if (this.name.length === 1) {
          this.btn_text =  'Valider';
        }
      }
      else if (this.step === 1) {
        this.btn_text =  'Lancer la partie';
      }
      return false;
    },
  },
  mounted() {

  },
  methods: {
    ask_id() {
      const vm = this;
      if (this.step === 0) {
        this.step = 1;

        let peer = new Peer(this.id_admin);
        peer.on('open', function () {
          vm.store.setPeer(peer);
          vm.id_admin = peer.id;
          vm.$nextTick(() => {
            vm.$refs.id_admin.focus();
          });
        });
      }
      else {
        this.launch();
      }
    },
    launch() {
      const vm = this;

      // Stockage de la partie dans le navigateur.
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

      // Ouverture de la connexion webrtc et passage sur l'écran d'admin.
      if (this.id_admin !== '' && this.store.peer.id !== this.id_admin) {
        this.store.peer.destroy();
        let peer = new Peer(this.id_admin);
        peer.on('open', function () {
          vm.store.setPeer(peer);
          router.push('/admin');
        });
      }
      else {
        router.push('/admin');
      }
    },
  },
}
</script>

<template>
  <h1>Créer une partie</h1>
  <div class="small-wrapper">
    <label v-if="step === 0" for="name">{{ t("Nom de votre partie. Vous pourrez le changer plus tard.") }}</label>
    <input v-if="step === 0" @keyup.enter="ask_id" autocomplete="off" v-model="name" required type="text" id="name" value="Ma partie" placeholder="Ma partie" maxlength="25">
    <label v-if="step === 1" for="id_admin">{{ t("Cet identifiant sera inclus dans votre lien d'invitation. Vous pouvez choisir le vôtre.") }}</label>
    <input v-if="step === 1" type="text" ref="id_admin" v-model="id_admin" id="id_admin" @keyup.enter="launch">
    <button class="btn-valid" :disabled="isBtnDisabled" @click="ask_id" @keyup.enter="ask_id">{{ btn_text }}</button>
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



