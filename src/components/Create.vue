<script>
import router from '../main.js'
import { usePlayerStore } from '../main';

export default {
  setup() {

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
      if (this.id_admin.length === 0 || this.name.length === 0) {
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
      let name = document.getElementById('name').value;
      let new_game = {
        id: Date.now(),
        name: name,
        characters: [],
        date: Date.now(),
        version: APP_VERSION,
        init: true
      };
      games_storage.push(new_game);
      store.setCurrentGame(new_game);
      store.current_game.initialized = false;
      store.current_game.tuto_on = true;
      store.current_game.game_started = false;
      localStorage.setItem('games', JSON.stringify(games_storage));

      // Ouverture de la connexion webrtc et passage sur l'écran d'admin.
      let id_admin = document.getElementById('id_admin').value;
      let peer = new Peer(id_admin);
      peer.on('open', function (conn) {
        store.setPeer(peer);
        router.push('/admin');
      });
    },
  },
}
</script>

<style>

</style>

<template>
  <h1>Créer une partie</h1>
  <div class="small-wrapper">
    <label for="id_admin">Identifiant de votre partie</label>
    <input v-model="id_admin" required type="text" id="id_admin" minlength="10" value="oiseauchapeau">
    <label for="id_admin">Nom de votre partie</label>
    <input autocomplete="off" v-model="name" required type="text" id="name" value="Ma partie" placeholder="Ma partie">
    <button :disabled="isBtnDisabled" v-on:click="launch">{{ btn_text }}</button>
  </div>
</template>



