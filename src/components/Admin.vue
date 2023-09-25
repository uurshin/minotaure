<script>
import router, { usePlayerStore } from '../main';
import { ref, watch, toRefs } from 'vue'
import '../assets/css/shepherd.css';
import 'vue-simple-context-menu/dist/vue-simple-context-menu.css'
import AdminTabIntro from '../components/AdminTabIntro.vue'
import AdminTabCharacters from '../components/AdminTabCharacters.vue'
import AdminTabTags from '../components/AdminTabTags.vue'
import AdminTabStats from '../components/AdminTabStats.vue'
import AdminTabGauges from '../components/AdminTabGauges.vue'
import AdminTabPoll from '../components/AdminTabPoll.vue'
import AdminTabChallenge from '../components/AdminTabChallenge.vue'
import AdminTabPick from '../components/AdminTabPick.vue'
import AdminTour from '../components/AdminTour.vue'
import { useI18n } from "vue-i18n";

export default {
  components: {
    AdminTabIntro,
    AdminTabCharacters,
    AdminTabStats,
    AdminTabTags,
    AdminTabGauges,
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
      tabs: [
        {id: 'intro', label: 'Introduction'},
        {id: 'characters', label: 'Personnages', tutorial: 'off' },
        {id: 'poll', label: 'Sondages', tutorial: 'off' },
        {id: 'challenge', label: 'Épreuve', tutorial: 'off' },
        {id: 'pick', label: 'Tirage', tutorial: 'off' },
        {id: 'gauges', label: 'Jauges', tutorial: 'blink' },
        {id: 'stats', label: 'Caractéristiques', tutorial: 'blink' },
        {id: 'tags', label: 'Tags', tutorial: 'blink' },
      ]
    }
  },
  computed: {
    activeTabs: function () {
      // Partie jamais démarrée : préparation
      if (this.store.current_game.tuto_on) {
        return this.tabs;
      }
      // Partie déjà démarrée
      else {
        return this.tabs.filter((tab) => tab.tutorial !== undefined );
      }
    }
  },
  mounted() {
    window.onbeforeunload =  function () {
      alert("admin onbefore unload");
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

    let vm = this;
    // Initialisation ou reprise de la partie.

    // Personnages.
    if (this.store.current_game.characters === undefined) {
      this.store.current_game.characters = [];
    }
    else {
      this.store.current_game.characters.forEach(function(character) {
        character.connection = null;
        character.watched = false;
        // watch(character, vm.store.characterWatch);
      });
    }

    // Initialisation des éléments de personnages.
    if (vm.store.current_game.initialized === false) {
      vm.store.current_game.stats = {
        fo1: {name: "Physique"},
        me1: {name: "Mental"}
      }
      vm.store.current_game.gauges = {
        li1: {name: "Vie", value: 10, deadly: true},
        wi1: {name: "Volonté", value: 10, deadly: false}
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
      console.log('Peer admin error : ' + err.type);
    });

    this.peer.on('disconnected', function () {
      console.log('Peer admin disconnect');
    });


    this.peer.on('connection', function (conn) {
      vm.store.connections[conn.connectionId] = conn;

      conn.on('data', function (data) {
        // Joueur connecté et en attente de l'id de la partie.
        if (data.handshake === 'readyForCall') {
          if (vm.store.current_game.game_started) {
            conn.send({
              handshake:'gameStart',
              game_token: vm.store.current_game.id
            });
          }
          else {
            vm.store.temp_connections.push(conn);
            conn.send({
              handshake:'gameWait',
              game_token: vm.store.current_game.id
            });
          }
        }
        // Joueur connecté avec id de partie, en attente d'un personnage.
        else if (data.handshake === 'readyForCharacter') {
          let message = {
            game_token: vm.store.current_game.id,
          };

          let new_character;
          if (data.token !== undefined) {
            new_character = vm.store.retrieveCharacter(data.token);
            new_character.connection = conn.connectionId;

            console.log('watch 1 set');
            if (!new_character.watched) {
              new_character.watched = true;
              watch(new_character, vm.store.characterWatch);
            }
          }
          // Nouveau personnage.
          if (new_character === undefined) {
            message.handshake = 'initCharacter';
            message.creation_form = {
              options: vm.store.getStartTags()
            };
            conn.send(message);
          }
          else {
            conn.send({
              handshake:'displayCharacter',
              game_token: vm.store.current_game.id,
              character: vm.store.prepareCharacter(new_character)
            });
          }

          // if (vm.is_live) {
          //   vm.peer.call(conn.peer, vm.stream);
          // }
        }
        else if (data.handshake === 'characterChoices') {
          let character = vm.store.generateCharacter(data, conn);
          character.connection = conn.connectionId;
          console.log('watch 2 set');

          let retrieved_character = vm.store.retrieveCharacter(character.token);
          retrieved_character.connection = conn.connectionId;
          if (!retrieved_character.watched) {
            retrieved_character.watched = true;
            watch(retrieved_character, vm.store.characterWatch);
          }

          conn.send({
            handshake:'displayCharacter',
            game_token: vm.store.current_game.id,
            character: vm.store.prepareCharacter(character)
          });

        }
        else if (data.handshake === 'pollAnswer') {
          let character = vm.store.retrieveCharacter(data.token);
          if (character && data.code !== undefined && character.polls[data.code] !== undefined) {
            vm.store.pollAddAnswer(data.code, data.answer);
            delete character.polls[data.code];
          }
        }
      });

      conn.on('close', function() {
        // TODO ?
        console.log('Connection admin alert : deco');
      })

      conn.on('error', function(err) {
        console.log('Connection admin error : ' + err.type);
      })
    });
  },
  methods: {
    start_video() {
      let vm = this;
      if (this.is_live) {
        this.calls.forEach((call) => call.close());
        this.video.pause();
        this.is_live = false;
        this.btn_live = 'Démarrer la vidéo';
      }
      else {
        this.video.play();
        this.is_live = true;

        // this.store.connections.forEach(function(connection) {
        //   if (connection.open) {
        //     let call = vm.peer.call(connection.peer, vm.stream);
        //     vm.calls.push(call);
        //   }
        // });
        this.btn_live = 'Arrêter la vidéo';
      }
    },
    broadcast_video() {
      if (this.video === null) {
        navigator.mediaDevices
            .getUserMedia({
              video: true,
            })
            .then((stream) => {
              const video = document.querySelector("video");
              video.srcObject = stream;
              video.onloadedmetadata = () => {
                this.video = video;
                this.stream = stream;
                this.start_video();
              };
            })
            .catch((err) => {
              console.error(`${err.name}: ${err.message}`);
            });
      }
      else {
        this.start_video();
      }
    },
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
        navigator.clipboard.writeText(window.location.origin + '#join?id=' + this.store.peer.id);
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
  }
}
</script>

<template>
  <div>
    <span></span>
  </div>
  <admin-tour ref="admin_tour"></admin-tour>
  <div id="admin-wrapper">
    <div class="tabs">
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
      <admin-tab-gauges ref="admin_tab_gauges"></admin-tab-gauges>
      <admin-tab-stats ref="admin_tab_stats"></admin-tab-stats>
      <admin-tab-tags ref="admin_tab_tags"></admin-tab-tags>
      <admin-tab-challenge ref="admin_tab_challenge"></admin-tab-challenge>
      <admin-tab-poll ref="admin_tab_poll"></admin-tab-poll>
      <admin-tab-pick ref="admin_tab_pick"></admin-tab-pick>
    </div>
  </div>
<!--  <div class="video-wrapper">-->
<!--    <video muted></video>-->
<!--    <button @click="broadcast_video">{{ btn_live }}</button>-->
<!--  </div>-->
</template>

<style lang="scss">
  #admin-wrapper {
    margin-bottom: auto;
    align-self: stretch;
  }

  .multiselect {
    min-width: 200px;

    .multiselect__option--group {
      text-align: center;
      background: black !important;
      color: white !important;

      &:after {
        content: 'V'
      }
    }

    .multiselect__input {
      color: black;
      width: auto;
      min-width: 100px;
      margin: 0;
    }

    .multiselect__tags {
      padding: 4px;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      align-items: center;
      font-size: 0.8em;
      background: var(--background-select);
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
        color: var(--font-color);
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

      &:first-child {
        border-left: none !important;
      }

      @include media("<desktop") {
        padding: 15px 10px;
      }

      &.open {
        border: 1px solid var(--font-color);
        border-bottom: none;
        border-top: none;
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

        .list-item {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .action {
          margin-left: auto;
          display: flex;
          gap: 10px;
        }
      }

      .action-group {
        display: flex;
        gap: 15px;
        align-items: center;
      }
    }
  }

  .id-game {
    order: 1;
    align-self: center;
    display: block;
    padding: 15px;
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
