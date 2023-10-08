<script>
import router, { usePlayerStore } from '../main';
import { ref, watch, toRefs } from 'vue'
import '../assets/css/shepherd.css';
import 'vue-simple-context-menu/dist/vue-simple-context-menu.css'
import AdminTabIntro from '../components/AdminTabIntro.vue'
import AdminTabCharacters from '../components/AdminTabCharacters.vue'
import AdminTabTags from '../components/AdminTabTags.vue'
import AdminTabSettings from '../components/AdminTabSettings.vue'
import AdminTabPoll from '../components/AdminTabPoll.vue'
import AdminTabChallenge from '../components/AdminTabChallenge.vue'
import AdminTabPick from '../components/AdminTabPick.vue'
import AdminTour from '../components/AdminTour.vue'
import { useI18n } from "vue-i18n";
import { Peer } from "peerjs";

export default {
  components: {
    AdminTabIntro,
    AdminTabCharacters,
    AdminTabTags,
    AdminTabSettings,
    AdminTabPoll,
    AdminTabChallenge,
    AdminTabPick,
    AdminTour
  },
  beforeMount() {
    // Reprise d'une partie après un refresh
    let temp_game = localStorage.getItem('temp_game');
    if (temp_game) {
      let temp_game_parsed = JSON.parse(temp_game);
      localStorage.removeItem('temp_game');
      if (temp_game_parsed.peer !== null) {
        let games = JSON.parse(localStorage.getItem('games'));
        let found = games.find((element) => element.id === temp_game_parsed.id);
        this.store.setCurrentGame(found);
        let peer = new Peer(temp_game_parsed.peer);
        peer.reconnect();
        this.store.setPeer(peer);
      }
    }
    else if (this.store.current_game === null) {
      router.push('/home');
    }
  },
  setup() {
    const store = usePlayerStore();
    const { t } = useI18n();
    const is_live = ref[false];
    const btn_live = ref('Démarrer la vidéo');
    const current_tab = ref('');
    return {
      store, t, is_live, btn_live, current_tab
    }
  },
  data() {
    return {
      stream: null,
      calls: [],
      peer: null,
      video: null,
      is_live: false,
      game_name_focused: -1,
      temp_game_name: '',
      tabs: [
        {id: 'intro', label: 'Introduction'},
        {id: 'characters', label: 'Personnages', tutorial: 'off' },
        {id: 'poll', label: 'Sondages', tutorial: 'off' },
        {id: 'challenge', label: 'Épreuve', tutorial: 'off' },
        {id: 'pick', label: 'Tirage', tutorial: 'off' },
        {id: 'tags', label: 'Tags', tutorial: 'blink' },
        {id: 'settings', label: 'Paramètres', tutorial: 'blink' }
      ]
    }
  },
  computed: {
    activeTabs: function () {
      // The game never started so it's preparation mode.
      if (this.store.current_game.tuto_on) {
        return this.tabs;
      }
      // The game has already been started all least one time.
      else {
        return this.tabs.filter((tab) => tab.tutorial !== undefined );
      }
    },
    gameLabel: function() {
      return (this.game_name_focused === 0 ? this.$t('Renommer la partie') : this.store.current_game.name);
    }
  },
  mounted() {
    let vm = this;
    let attempting_reconnect = false;

    // Before the GM quit the page, save the game and store some info to
    // resume the game if it's a page refresh.
    window.onbeforeunload =  function () {
      console.log("Minotaure : admin onbefore unload");
      if (vm.store.current_game !== null) {
        let temp_game = {
          'id': vm.store.current_game.id,
          'peer': vm.store.peer.id
        };
        localStorage.setItem('temp_game', JSON.stringify(temp_game));
        vm.store.saveQuit();
      }
    }

    this.current_tab = this.store.current_game.tuto_on ? 'intro' : 'characters';
    this.changeTab(this.current_tab);

    // Characters loading.
    if (this.store.current_game.characters === undefined) {
      this.store.current_game.characters = [];
    }
    else {
      this.store.current_game.characters.forEach(function(character) {
        character.connection = null;
        character.watched = true;
        watch(character, vm.store.characterWatch);
      });
    }

    // It's the first time the game is loaded, so initialize some data.
    if (vm.store.current_game.initialized === false) {
      vm.store.current_game.stats = {
        fo1: {name: vm.$t('Physique')},
        me1: {name: vm.$t('Mental')}
      }
      vm.store.current_game.gauges = {
        li1: {name: vm.$t('Vie'), value: 10, deadly: true},
        wi1: {name: vm.$t('Volonté'), value: 10, deadly: false}
      }
      vm.store.current_game.tag_groups = [];
      vm.store.current_game.polls = {};
      vm.store.current_game.initialized = true;
    }
    else {
      let init_keys = ['stats', 'tag_groups', 'gauges'];
      init_keys.forEach(function(init_key) {
        if (vm.store.current_game[init_key] === undefined) {
          vm.store.current_game[init_key] = [];
        }
      })
    }

    this.peer = this.store.peer;

    this.peer.on('error', function (err) {
      console.log('Minotaure : peer admin error - ' + err.type);
    });

    this.peer.on("disconnected", function(){
      let count = 0;
      console.log('Minotaure : peer admin disconnected');
      if (!attempting_reconnect) {
        attempting_reconnect = true;
        let interval = setInterval(function () {
          if (vm.peer.open === true || vm.peer.destroyed === true) {
            clearInterval(interval);
            attempting_reconnect = false;
            if (vm.peer.open === true) {
              console.log('Minotaure : reconnection successfull');
            }
            else if (vm.peer.destroyed === true) {
              console.log('Minotaure : peer destroyed');
            }
          }
          else if (count < 10) {
            count += 1;
            console.log('Minotaure : reconnection attempt number ' + count);
            vm.peer.reconnect();
          }
        }, 4000)
      }
    });

    this.peer.on('connection', function (conn) {
      vm.store.connections[conn.connectionId] = conn;

      conn.on('data', function (data) {
        // Player connected and waiting for the game ID.
        if (data.handshake === 'readyForCall') {
          // The game has already started, send the corresponding signal.
          if (vm.store.current_game.game_started) {
            conn.send({
              handshake:'gameStart',
              game_token: vm.store.current_game.id
            });
          }
          else {
            // The game has not started, send the corresponding signal.
            vm.store.temp_connections.push(conn);
            conn.send({
              handshake:'gameWait',
              game_token: vm.store.current_game.id
            });
          }
        }
        // The player is connected and waiting for a character.
        else if (data.handshake === 'readyForCharacter') {
          let message = {
            game_token: vm.store.current_game.id,
          };

          let new_character;

          // The player submitted a character token to retrieve a (possibly) existing character.
          if (data.token !== undefined) {
            new_character = vm.store.retrieveCharacter(data.token);
            // The character exists and should be sent to the player.
            if (new_character !== undefined) {
              // It's not a character requested after the death or a previous one.
              if (data.reset === undefined) {
                new_character.connection = conn.connectionId;
                if (!new_character.watched) {
                  new_character.watched = true;
                  watch(new_character, vm.store.characterWatch);
                }
              }
              // It's a death reset and we should erase some data of the dead.
              else {
                new_character.connection = null;
                new_character.token = null;
              }
            }
          }
          // New character should be created (it could be after death), send a creation form.
          if (new_character === undefined || data.reset !== undefined) {
            message.handshake = 'initCharacter';
            message.creation_form = {
              options: vm.store.getStartTags()
            };
            conn.send(message);
          }
          // It's not a new character, send it.
          else {
            conn.send({
              handshake:'displayCharacter',
              game_token: vm.store.current_game.id,
              character: vm.store.prepareCharacter(new_character)
            });
          }
        }
        // Creation form was filled and received, create a new character and send it.
        else if (data.handshake === 'characterChoices') {
          vm.sendNewCharacter(data, conn);
        }
        // Answer to a poll was received, add it to the right poll.
        else if (data.handshake === 'pollAnswer') {
          let character = vm.store.retrieveCharacter(data.token);
          if (character && data.code !== undefined && character.polls[data.code] !== undefined) {
            vm.store.pollAddAnswer(data.code, data.answer);
            character.polls[data.code].answer = data.answer;
          }
        }
      });

      conn.on('close', function() {
        console.log('Minotaure : PJ disconnected');
      })

      conn.on('error', function(err) {
        console.log('Minotaure : connection admin error : ' + err.type);
      })
    });
  },
  methods: {
    changeTab(nameRef) {
      if (this.store.current_game.tuto_on) {
        let tab_found = this.tabs.find((tab) => tab.id === nameRef);
        if (tab_found !== undefined && tab_found.tutorial === 'blink') {
          tab_found.tutorial = 'on';
        }
        tab_found = this.tabs.find((tab) => tab.tutorial === 'blink');
        if (tab_found === undefined) {
          this.$refs['start'].classList.add('attention');
        }
      }
      if (this.current_tab != null) {
        this.$refs['admin_tab_' + this.current_tab].$refs['tab'].classList.remove('open');
      }
      this.current_tab = nameRef;
      this.$refs['admin_tab_' + nameRef].$refs['tab'].classList.add('open');
    },
    shareLink(event) {
      const vm = this;
      if (window.location.origin === 'null') {
        navigator.clipboard.writeText(this.store.peer.id);
        event.target.innerText = this.$t("Identifiant de partie copié !");
      }
      else {
        navigator.clipboard.writeText(window.location.href.slice(0, location.href.lastIndexOf("/")) + 'join?id=' + this.store.peer.id);
        event.target.innerText = this.$t("Lien d'invitation copié !");
      }

      setTimeout(function() {
        event.target.innerText = vm.$t('Inviter à jouer');
      }, 2000)
    },
    startTour() {
      this.$refs['admin_tour'].startTour();
    },
    startGame() {
      let vm = this;
      this.store.current_game.game_started = true;
      this.store.temp_connections.forEach(function(connection) {
        connection.send({
          handshake:'gameStart',
          game_token: vm.store.current_game.id
        });
      })
      this.store._temp_connections = [];
      this.store.current_game.tuto_on = false;
      this.changeTab('characters');
    },
    gameStartRename() {
      this.game_name_focused = 1;
      this.$nextTick(() => {
        this.$refs.input_game_name.focus();
      });
      this.temp_game_name = this.store.current_game.name;
    },
    gameConfirmRename() {
      this.store.current_game.name = this.temp_game_name;
      this.store.characters.forEach((character) => character.game_name = this.temp_game_name);
      this.game_name_focused = -1;
    },
    sendNewCharacter(data, conn) {
      let vm = this;
      let character = this.store.generateCharacter(data, conn);
      character.connection = conn.connectionId;

      let retrieved_character = this.store.retrieveCharacter(character.token);
      retrieved_character.connection = conn.connectionId;
      if (!retrieved_character.watched) {
        retrieved_character.watched = true;
        watch(retrieved_character, this.store.characterWatch);
      }

      conn.send({
        handshake:'displayCharacter',
        game_token: vm.store.current_game.id,
        character: vm.store.prepareCharacter(character)
      });
    }
  }
}
</script>

<template>
  <admin-tour ref="admin_tour"></admin-tour>
  <div id="admin-wrapper">
    <div class="tabs">
      <button v-if="game_name_focused < 1" class="game-name" @keyup.enter="gameStartRename" @click="gameStartRename">{{ gameLabel }}</button>
      <input maxlength="25" ref="input_game_name" id="input-game-name" v-show="game_name_focused === 1" type="text" v-model="temp_game_name" @blur="gameConfirmRename" @keyup.enter="gameConfirmRename" />
      <div
          tabindex="0"
          v-for="tab in activeTabs"
          :ref="'tab_label_' + tab.id"
          @keyup.enter="changeTab(tab.id)"
          @click="changeTab(tab.id)"
          class="tab-label"
          :class="{open: current_tab === tab.id, attention: tab.tutorial === 'blink' && this.store.current_game.tuto_on}"
      >
        {{ t(tab.label) }}
      </div>
      <div class="tab-details">
        <button @click="startTour">{{ t('Aide')}}</button>
        <button class="icon-email" v-if="peer !== undefined" @click="shareLink">
          {{ t("Inviter à jouer") }}
        </button>
        <button ref="start" class="icon-play" :class="{'btn-important': !store.current_game.tuto_on, attention: !this.store.current_game.tuto_on}" v-if="!store.current_game.game_started" @click="startGame">
          {{ t("Démarrer") }}
        </button>
      </div>
    </div>
    <div class="tabs-content">
      <admin-tab-intro ref="admin_tab_intro"></admin-tab-intro>
      <admin-tab-characters ref="admin_tab_characters"></admin-tab-characters>
      <admin-tab-settings ref="admin_tab_settings"></admin-tab-settings>
      <admin-tab-tags ref="admin_tab_tags"></admin-tab-tags>
      <admin-tab-challenge ref="admin_tab_challenge"></admin-tab-challenge>
      <admin-tab-poll ref="admin_tab_poll"></admin-tab-poll>
      <admin-tab-pick ref="admin_tab_pick"></admin-tab-pick>
    </div>
  </div>
</template>

<style lang="scss">
  #admin-wrapper {
    margin-bottom: auto;
    align-self: stretch;

    button {
      background-color: var(--button-background);

      &.active {
        border: 1px solid #39c6ff;
      }
    }

    .game-name {
      border-radius: 0;
      background: var(--font-color);
      color: var(--inverse-font-color);
    }
    #input-game-name {
      border-radius: 0;
      height: auto;
      text-align: center;
    }
  }

  .multiselect {
    min-width: 200px;
    margin-top: 20px;
    box-sizing: unset;

    &:after {
      content: '';
      border-right: var(--border-input);
      height: 8px;
      position: absolute;
      right: 0;
      z-index: 1000;
      width: 20px;
      display: block;
      top: -5px;
    }

    .multiselect__option--group {
      text-align: center;
      background: black !important;
      color: white !important;

      &.multiselect__option--highlight.multiselect__option--group-selected:after {
        content: '-'
      }

      &.multiselect__option--highlight:after {
        content: '+'
      }
    }

    .multiselect__input {
      position: absolute;
      top: -21px;
      right: 0;
      width: auto;
      min-width: 120px;
      margin: var(--margin-multiselect);
      text-align: center;
      color: black;
      border: var(--multiselect-border);
      border-bottom: 1px solid white;
      border-radius: 5px 5px 0 0;
    }

    .multiselect__tags {
      position: relative;
      padding: 4px;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      align-items: center;
      font-size: 0.8em;
      background: var(--background-select);
      border: var(--border-input);
      border-radius: 5px 0 5px 5px;
    }

    &.left-multiselect {
      width: auto;

      .multiselect__input {
        left: 0;
      }
      .multiselect__tags {
        border-radius: 0 5px 5px 5px;
      }
    }

    &.multiselect--active {
      .multiselect__tags {
        border-top-right-radius: 0;
        border-top-left-radius: 0;
      }
      //.multiselect__input {
      //  left: 0;
      //}
    }

    .multiselect__tags-wrap {
      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 5px;
    }

    .multiselect__tag {
      display: flex;
      padding: 6px;
      align-items: center;
      margin: 0;
      background: var(--tag-color);
    }

    .multiselect__tag-icon::after {
      display: flex;
      position: relative;
    }

    .multiselect__tag-icon {
      position: relative;
      width: auto;
      margin: 0;

      &:after {
        font-size: 2em;
        color: var(--button-color);
      }
    }
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    margin-bottom: 0;

    > .tab-label {
      display: flex;
      margin-bottom: auto;
      justify-content: center;
      align-items: center;
      padding: 15px 20px;
      cursor: pointer;
      font-weight: 500;
      border-bottom: 1px solid var(--font-color);

      @include media("<desktop") {
        padding: 15px 10px;
      }

      &.open  {
        position: relative;
        &:before {
          position: absolute;
          content: '';
          border-left: 1px solid var(--tab-border-color);
          border-right: 1px solid var(--tab-border-color);
          border-bottom: 2px solid var(--background-color);
          width: 100%;
          height: 100%;
          left: 0;
        }

        &:first-of-type:before {
          border-left: none;
        }
      }
    }

    > .tab-details {
      border-bottom: 1px solid var(--font-color);
      display: flex;
      flex: 1;
      justify-content: flex-end;

      > button {
        display: flex;
        align-items: center;
        border-radius: 0;
        gap: 10px;
      }
    }
  }

  .tabs-content {
    margin-bottom: auto;

    .tab {
      display: none;
      padding: 30px;
      flex-grow: 1;

      &.open {
        display: block;

        &#tab-tags {
          display: flex;
          justify-content: unset;
          flex-direction: column;
          gap: 15px;
          text-align: left;
        }
      }

      > div:first-child {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
    }
  }

  .actions {
    display: flex;
    gap: 15px;
    flex-basis: 100%;
    align-items: center;

    @include media("<tablet") {
      flex-wrap: wrap;
    }

    > label {
      display: flex;
      align-items: center;
    }

    &.secondary {
      > button:first-of-type {
        margin-left: auto;
      }
    }
    &:not(.secondary) {
      > button:first-of-type {
        margin-right: auto;
      }
    }
  }

  .attention {
    background-color: black;
    animation-name: color;
    animation-duration: 2s;
    animation-iteration-count: infinite;

    &:before {
      border-radius: 100%;
      animation-name: invert-color;
      animation-duration: 2s;
      animation-iteration-count: infinite;
    }
  }

  @keyframes color {
    0% {
      background-color: var(--success-background);
    }
    50% {
      background-color: black;
    }
    100% {
      background-color: var(--success-background);
    }
  }
  @keyframes invert-color {
    0% {
      background-color: black;
    }
    50% {
      background-color: var(--success-background);
    }
    100% {
      background-color: black;
    }
  }
</style>
