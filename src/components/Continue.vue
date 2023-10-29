<script>
import router, { usePlayerStore }  from '../main';
import { ref } from 'vue'
import { Peer } from "peerjs";

export default {
  setup() {
    const version = APP_VERSION;
    const versions = version.split('.');
    let games_storage = localStorage.getItem('games');
    games_storage = (games_storage == null ? [] : JSON.parse(games_storage));
    const games = ref(games_storage);

    return {
      games, versions, version
    }
  },
  data() {
    const store = usePlayerStore();
    return {
      store,
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
    hasDeprecatedGames() {
      return this.games.findIndex((game) => this.versionIsDeprecated(game.version)) > -1;
    },
    titleContinue() {
      const vm = this;
      if (this.ask_id) {
        let found = this.games.find((game) => game.id === vm.ask_id);
        if (found) {
          return this.$t('continue_game', {name: found.name});
        }
      }
      return this.$t('game_manage');
    },
  },
  methods: {
    versionIsDeprecated(game_version) {
      if (game_version === undefined) {
        return false
      }
      else {
        let numbers = game_version.split('.');
        return (
            numbers[0] !== this.versions[0] ||
            numbers[1] !== this.versions[1]
        );
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB').format(date);
    },
    deleteGame(id, event) {
      if (!this.confirmDelete) {
        event.target.innerText = this.$t('confirm_question');
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
        event.target.innerText = this.$t('confirm_question');
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
      const vm = this;
      this.id_admin = '';
      if (this.store.peer) {
        this.store.peer.destroy();
      }
      this.ask_id = id;
      let peer = new Peer();
      peer.on('open', function (conn) {
        vm.store.setPeer(peer);
        console.log(peer.id);
        vm.id_admin = peer.id;
      });
    },
    cancelContinue() {
      this.ask_id = false;
    },
    continueGame() {
      const vm = this;
      let found = this.games.find((element) => element.id === this.ask_id);
      if (found) {
        this.store.setCurrentGame(found);
        this.store.current_game.game_started = false;
        if (this.id_admin !== '' && this.store.peer.id !== this.id_admin) {
          this.store.peer.destroy();
          let peer = new Peer(this.id_admin);
          peer.on('open', function () {
            vm.store.setPeer(peer);
          });
        }
        router.push('/admin');
      }
    }
  }
}
</script>

<template>
  <h1>{{ titleContinue }}</h1>
  <div class="small-wrapper menu-wrapper">
    <span v-html="$t('warning_version', {version: version})" v-if="hasDeprecatedGames"></span>
    <div class="game" v-for="(game, key) in games" v-if="!ask_id">
      <div class="title">
        <span>{{ game.name }}<span class="danger" v-if="game.version !== undefined && versionIsDeprecated(game.version)">*</span></span>
        <span class="date" v-if="activated !== key">{{ formatDate(game.date) }}</span>
      </div>
      <span v-if="activated !== key">{{ $t('count_personnage', {count: game.characters.length}) }}</span>
      <div class="hidden-mobile" :class="{active: activated === key}">
        <button class="btn-valid" @click="askPublicId(game.id)">{{ $t('continue') }}</button>
        <button class="btn-danger" @click="deleteGame(game.id, $event)">{{ $t('delete') }}</button>
      </div>
      <button class="visible-mobile" @click="activated = key;" v-if="activated !== key">{{ $t('see_more') }}</button>
    </div>
    <div class="vertical-wrapper" v-if="!games.length">
      <span>{{ $t("any_game") }}</span>
      <router-link to="/create">{{ $t("game_create") }}</router-link>
    </div>
    <button v-if="games.length > 1 && !ask_id" class="btn-danger delete-all" @click="deleteAllGames($event)">{{ $t('delete_all_games') }}</button>
    <div class="continue-game" v-if="ask_id">
      <input name="id_admin" type="text" id="id_admin" v-model="id_admin">
      <label for="id_admin">{{ $t("game_id_help") }}</label>
      <button class="btn-valid" @click="continueGame()">{{ $t('start_game') }}</button>
      <button @click="cancelContinue()" >{{ $t('cancel') }}</button>
    </div>
  </div>
</template>


<style scoped lang="scss">
  .continue-game {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 15px;

    input[type='text'] {
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
    label {
      flex: 1;
      text-align: left;
    }

    button {
      flex-basis: 100%;

      &.btn-valid {
        margin-top: 30px;
      }
    }
  }

  .game {
    display: grid;
    grid-template-columns: 1fr 1fr 2fr;
    align-items: center;
    gap: 20px 60px;
    text-align: left;
    background: var(--background-card-color);
    border-radius: 10px;
    padding: 10px;

    > div {
      display: flex;
      gap: 15px;

      &.title {
        flex-direction: column;
        gap: 0;

        .date {
          font-size: 0.8em;
        }
      }
    }

    @include media("<tablet") {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;

      .hidden-mobile,
      .visible-mobile {
        flex-basis: 100%;
        justify-content: space-between;

        .btn-valid {
          flex: 1;
        }
      }
    }
  }

  .delete-all {
    margin-top: 30px;
    align-self: center;
  }
</style>
