<script>
import router, { usePlayerStore }  from '../main';
import { ref } from 'vue'
import {useI18n} from "vue-i18n";

export default {
  setup() {
    const { t } = useI18n({
      warnHtmlMessage: false,
      warnHtmlInMessage: 'off'
    });
    const version = APP_VERSION;
    let games_storage = localStorage.getItem('games');
    games_storage = (games_storage == null ? [] : JSON.parse(games_storage));
    const games = ref(games_storage);

    return {
      games, t, version
    }
  },
  data() {
    return {
      ask_id: false,
      id_admin: '',
      btn_text: '',
      activated: -1,
      confirmDelete: false
    }
  },
  mounted() {
    localStorage.removeItem('temp_game');
  },
  computed: {
    isBtnDisabled() {
      if (this.id_admin.length === 0) {
        this.btn_text = this.$t('En attente');
        return true;
      }
      this.btn_text = this.$t('Lancer la partie');
      return false;
    },
    hasDeprecatedGames() {
      return (this.games.findIndex((game) => game.version !== undefined && game.version !== this.version) > -1);
    }
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString);
      // Then specify how you want your dates to be formatted
      return new Intl.DateTimeFormat('en-GB').format(date);
    },
    deleteGame(id, event) {
      if (!this.confirmDelete) {
        event.target.innerText = this.$t('Confirmer ?');
        this.confirmDelete = true;
      }
      else {
        let found = this.games.findIndex((element) => element.id === id);
        if (found > -1) {
          this.games.splice(found, 1);
          localStorage.setItem('games', JSON.stringify(this.games));
        }
        this.confirmDelete = false;
        this.activated = -1;
      }
    },
    deleteAllGames(event) {
      if (!this.confirmDelete) {
        event.target.innerText = this.$t('Confirmer ?');
        this.confirmDelete = true;
      }
      else {
        this.games = [];
        localStorage.setItem('games', JSON.stringify(this.games));
        this.confirmDelete = false;
        this.activated = -1;
      }
    },
    askPublicId(id) {
      this.ask_id = id;
    },
    cancelContinue() {
      this.ask_id = false;
    },
    continueGame() {
      const store = usePlayerStore();
      let found = this.games.find((element) => element.id === this.ask_id);
      if (found) {
        store.setCurrentGame(found);
        store.current_game.game_started = false;

        let peer = new Peer(this.id_admin);
        peer.on('open', function (conn) {
          store.setPeer(peer);
          router.push('/admin');
        });
        peer.on('error', function(err) {
          console.log(err);
        });
      }
    }
  }
}
</script>

<template>
  <h1>{{ t('Continuer une partie') }}</h1>
  <div class="small-wrapper">
    <span v-html="$t('warning_version', {version: version})" v-if="hasDeprecatedGames"></span>
    <button v-if="games.length > 1" class="btn-danger" @click="deleteAllGames($event)">{{ t('Supprimer toutes les parties') }}</button>
    <div class="game" v-for="(game, key) in games" v-if="!ask_id">
      <span>{{ game.name }}<span class="danger" v-if="game.version !== undefined && game.version !== version">*</span></span>
      <div v-if="activated !== key">
        <span>{{ formatDate(game.date) }}</span>
        <span>{{ t('count_personnage', {count: game.characters.length}) }}</span>
      </div>
      <div class="hidden-mobile" :class="{active: activated === key}">
        <button class="btn-valid" @click="askPublicId(game.id)">{{ t('Continuer la partie') }}</button>
        <button class="btn-danger" @click="deleteGame(game.id, $event)">{{ t('Supprimer la partie') }}</button>
      </div>
      <button class="visible-mobile" @click="activated = key;" v-if="activated !== key">{{ t('Voir plus') }}</button>
    </div>
    <div v-if="!games.length">
      {{ t("Vous n'avez créé aucune partie.") }}
      <router-link to="/create">{{ t("Créer une partie") }}</router-link>
    </div>
    <div class="vertical-wrapper" v-if="ask_id">
      <label for="id_admin">{{ t("Identifiant public de votre partie") }}</label>
      <input name="id_admin" type="text" id="id_admin" v-model="id_admin">
      <span class="description">{{ t("Cet identifiant servira à rejoindre la partie pour les participants.") }}</span>
      <button @click="continueGame()" :disabled="isBtnDisabled" >{{ btn_text }}</button>
      <button @click="cancelContinue()" >{{ t('Annuler') }}</button>
    </div>
  </div>
</template>


<style scoped lang="scss">
  .game {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    gap: 15px;

    > div {
      display: flex;
      gap: 15px;
    }
  }
</style>
