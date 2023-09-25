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
    return {
      peer: '',
      connections: [],
      id_admin: '',
      name: '',
      btn_text: 'En attente'
    }
  },
  computed: {
    isBtnDisabled() {
      if (this.name.length === 0) {
        this.btn_text =  'En attente';
        return true;
      }
      this.btn_text =  'Lancer la partie';
      return false;
    },
  },
  mounted() {

  },
  methods: {
    launch() {
      const store = usePlayerStore();

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
      store.setCurrentGame(new_game);
      store.current_game.initialized = false;
      store.current_game.tuto_on = true;
      store.current_game.game_started = false;
      localStorage.setItem('games', JSON.stringify(games_storage));

      // Ouverture de la connexion webrtc et passage sur l'écran d'admin.
      let peer = new Peer(this.id_admin);
      peer.on('open', function (conn) {
        store.setPeer(peer);
        router.push('/admin');
      });
    },
  },
}
</script>

<template>
  <h1>Créer une partie</h1>
  <div class="small-wrapper">
    <label for="name">Nom de votre partie</label>
    <input autocomplete="off" v-model="name" required type="text" id="name" value="Ma partie" placeholder="Ma partie">
    <label for="id_admin">Identifiant public de votre partie</label>
    <input type="text" v-model="id_admin" required id="id_admin">
    <span class="description">{{ t("Cet identifiant servira à rejoindre la partie pour les participants. Laissez vide pour laisser le système choisir pour vous.") }}</span>
    <button :disabled="isBtnDisabled" v-on:click="launch">{{ btn_text }}</button>
  </div>
</template>



