<script>
import router, { usePlayerStore } from '../main';
import { ref } from 'vue'
import {useI18n} from "vue-i18n";

export default {
  setup() {
    const character = ref({});
    const freeze = ref(false);
    return {
      freeze, character
    }
  },
  data() {
    const store = usePlayerStore();
    const { t } = useI18n();
    return {
      store,
      t,
      option_picked: [],
      name_picked: '',
      pseudo_picked: '',
      creation_form: false,
      gameStart: false,
      answers: []
    }
  },
  beforeMount() {
    // Reprise d'une partie après un refresh
    window.addEventListener("beforeunload", event => {
      if (this.store.connection !== null) {
        localStorage.setItem('temp_peer', true);
        this.store.connection.close();
        this.store._leaving = true;
      }
    })
  },
  computed: {
    characterIsInvalid: function () {
      return (this.name_picked === '' || (this.creation_form !== false && this.option_picked !== undefined && this.option_picked.length !== this.creation_form.options.length));
    },
    activePolls: function () {
      // Todo optimize.
      if (this.character.polls !== undefined && Object.entries(this.character.polls).length) {
        let active_polls = Object.values(this.character.polls).filter(function(poll) {
          return poll.active !== undefined && poll.active && poll.answer === undefined;
        });
        return active_polls.length > 0;
      }
      return false;
    }
  },
  mounted() {
    this.freeze = true;
    this.store._leaving = false;
    this.store.setTempPeer( localStorage.getItem('temp_peer'));
    let gm_id = localStorage.getItem('gm_id');
    if (this.store.peer == null || this.store.temp_peer !== null) {
      this.store.join(gm_id, true);
    }
    else {
      this.handshake();
    }

    this.store.$subscribe((mutation, state) => {
      if (this.store.connection !== null && this.store.temp_peer !== null) {
        this.store.setTempPeer(null);
        this.handshake();
      }
    })
  },
  methods: {
    handshake() {
      let vm = this;
      this.store._leaving = false;

      // 1. Début de la poignée de main.
      console.log('Minotaure : handshake received')
      console.log(this.store.peer.id);
      this.store.connection.send({
        handshake: 'readyForCall'
      });

      console.log('Minotaure : ready for transaction');

      this.store.connection.on('close', function() {
        vm.freeze = true;
        if (!vm.store.leaving) {
          vm.store._leaving = false;
          const myTimeout = setTimeout(function() {
            console.log('Minotaure : reconnection attempted');
            vm.store.join(vm.store.connection.peer, true);
          }, 500);
        }
      });

      this.store.connection.on('data', function (data) {
        if (data.handshake !== undefined) {
          if (data.handshake === 'disconnectGracefully') {
            vm.store.setShouldReconnect(false);
          }
          // 2. Réception des données de la partie.
          if (data.handshake === 'gameWait') {
            vm.gameStart = false;
          }

          if (data.handshake === 'gameStart' || data.handshake === 'refresh') {
            vm.gameStart = true;

            let found = vm.findGame(data.game_token);

            // 3. Partie trouvée, envoi du token du joueur.
            if (found !== undefined) {
              vm.store.connection.send({handshake: 'readyForCharacter', token: found.character_token});
            }
            // 3bis. Partie introuvable, envoi du signal seulement.
            else {
              vm.store.connection.send({handshake: 'readyForCharacter'});
            }
          }

          // 4. Nouveau personnage, affichage du formulaire de création.
          else if (data.handshake === 'initCharacter') {
            vm.freeze = false;
            vm.creation_form = data.creation_form;
          }

          // 5. Personnage créé, récupération des infos.
          else if (data.handshake === 'displayCharacter') {
            vm.freeze = false;

            let found = vm.findGame(data.game_token)

            // 5bis. La partie n'existe pas, il faut la créer et stocker le personnage.
            if (found === undefined) {
              let games = vm.getLocalGames();
              games.push({
                game_token: data.game_token,
                character_token: data.character.token
              })
              localStorage.setItem('games_player', JSON.stringify(games));
            }

            vm.creation_form = false;
            vm.character = data.character;
          }
        }
      });

      // Réception d'un appel vidéo du MJ.
      // this.store.peer.on('call', function(call) {
      //   call.answer();
      //
      //   call.on('stream', function(stream) {
      //     const video = document.querySelector("video");
      //     video.srcObject = stream;
      //     video.onloadedmetadata = () => {
      //       video.play();
      //     };
      //   });
      // });
    },
    getLocalGames() {
      let games_str = localStorage.getItem('games_player');
      if (games_str !== null) {
        return JSON.parse(games_str);
      }
      localStorage.setItem('games_player', JSON.stringify([]));
      return [];
    },
    findGame(id) {
      let games = localStorage.getItem('games_player');
      if (games !== null) {
        games = JSON.parse(games);
        return games.find((element) => element.game_token === id);
      }

      return undefined;
    },
    sendCharacter() {
      let vm = this;
      if (this.creation_form.options.length && (this.option_picked === undefined || this.option_picked.length !== this.creation_form.options.length)) {
        return true;
      }

      if (this.name_picked !== '') {
        this.store.connection.send({
          handshake: 'characterChoices',
          choices: this.option_picked,
          name: this.name_picked,
          pseudo: this.pseudo_picked,
          token: vm.character.token
        });
      }

      this.name_picked = '';
      this.option_picked = [];
      this.creation_form = false;
    },
    sendAnswer(key) {
      let vm = this;
      this.store.connection.send({
        handshake: 'pollAnswer',
        answer: this.answers[key],
        code: key,
        token: vm.character.token
      });
    },
    newCharacter() {
      let vm = this;

      let foundIndex;
      let games = this.getLocalGames();
      if (games.length) {
        foundIndex = games.findIndex((element) => element.game_token === vm.character.game_token);
      }
      if (foundIndex) {
        games.splice(foundIndex, 1);
        localStorage.setItem('games_player', JSON.stringify(games));
      }

      this.store.connection.send({
        handshake: 'readyForCharacter',
        token: vm.character.token,
        reset: true
      });
    }
  }
}
</script>

<template>
  <span class="game-name" v-if="character.game_name !== undefined">{{ character.game_name }}</span>
  <div id="player-sheet" class="small-wrapper" :class="{ disabled: freeze }">
    <div class="lds-ripple"><div></div><div></div></div>
    <div class="game-wait" v-if="!gameStart">{{ t("En attente du démarrage de la partie") }}</div>

    <div id="creation" class="vertical-wrapper" v-if="creation_form">
      <label for="name">{{ t("Nom de votre personnage") }}</label>
      <input maxlength="12" type="text" id="name" v-model="name_picked" @keyup.enter="this.$refs['pseudo'].focus()" />
      <label for="pseudo">{{ t("Votre pseudo (optionnel)") }}</label>
      <input ref="pseudo" maxlength="12" type="text" id="pseudo" v-model="pseudo_picked" @keyup.enter="sendCharacter()" />


      <template v-for="(option, group_key) in creation_form.options">
        <div class="group-choice">
          <label :for="'tag-group-' + group_key">{{ t("Votre personnage est") }}</label>
          <select :id="'tag-group-' + group_key" v-model="option_picked[group_key]">
            <option v-for="(value, key, index) in option.tags" :value="value.code">
              {{ value.label }}
            </option>
          </select>
        </div>
      </template>
      <button :disabled="characterIsInvalid" @click="sendCharacter()">{{ t("Valider votre personnage") }}</button>
    </div>

    <div class="vertical-wrapper polls" v-else-if="activePolls">
      <div class="poll-wrapper" v-for="(poll, key, index) in character.polls">
        <div class="poll-content" v-if="poll.active && poll.answer === undefined">
          <span class="title">{{ poll.label }}</span>
          <span v-for="(option, poll_key) in poll.options">
              <input type="radio" :value="poll_key" :name="'poll_' + key" :id="'poll_' + key + '_' + poll_key" v-model="answers[key]">
              <label :for="'poll_' + key + '_' + poll_key">{{ option }}</label>
            </span>
          <button @click="sendAnswer(key)">{{ t("Envoyer mon choix") }}</button>
        </div>
      </div>
    </div>

    <div class="vertical-wrapper" id="sheet" v-else-if="character.alive">
      <div class="character-names">
        <span class="character-name">{{ character.name }}</span>
        <span v-if="character.pseudo" class="pseudo">{{ character.pseudo }}</span>
      </div>
      <div>
        <span v-for="gauge in character.gauges">
          <span>{{ gauge.label }}</span><span class="indicator">{{ gauge.value }}</span></span>
      </div>
      <div>
        <span v-for="stat in character.stats">
          <span>{{ stat.label }}</span><span class="indicator">{{ stat.value }}</span></span>
      </div>
      <div class="tags">
        <span v-for="tag in character.tags">{{ tag.label }}</span>
      </div>
      <ul v-if="character.challenge !== undefined && Object.entries(character.challenge).length">
        <li v-for="message in character.challenge.message">{{ message }}</li>
      </ul>
    </div>
    <div class="vertical-wrapper" v-else>
      <span class="character-name">{{ t('is_dead', {charname: character.name}) }}</span>
      <button @keyup.enter="newCharacter" @click="newCharacter">{{ t('Créer un nouveau personnage') }}</button>
    </div>
<!--    <video v-if="!creation_form"></video>-->
  </div>
</template>

<style scoped lang="scss">
  input {
    height: auto;
  }
  .game-wait {
    color: white;
  }

  .game-name {
    font-size: 1.2em;
    margin-top: 20px;
  }

  #player-sheet {
    display: flex;
    border-radius: 10px;
    color: var(--background-card-color);
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
    background: var(--font-color);
    padding: 10px;
    align-items: center;
    justify-content: center;

    input {
      border: 1px solid var(--border-color);
    }

    .character-names {
      display: flex;
      flex-direction: column;
      text-align: center;

      .character-name {
        font-size: 1.5em;
      }
    }

    .tags {
      display: flex;
      flex-direction: column;
      gap: 10px;

      > span {
        border-radius: 10px;
        background: var(--background-color);
        color: var(--font-color);
        padding: 5px;
        text-align: center;
      }
    }

    #sheet {
      width: 90%;

      > div:not(.tags)  {
        display: flex;
        flex-direction: column;
        gap: 10px;

        > span {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: center;
        }
      }
    }

    .indicator {
      padding: 5px;
      border-radius: 100%;
      border: 1px solid black;
      background: black;
      color: white;
      width: 24px;
    }

    &.disabled {
      background: none;
      border: none;

      .vertical-wrapper {
        display: none;
      }
      .lds-ripple {
        display: inline-block;
      }
    }

    .lds-ripple {
      display: none;
      position: relative;
      width: 80px;
      height: 80px;
    }
    .lds-ripple div {
      position: absolute;
      border: 4px solid #fff;
      opacity: 1;
      border-radius: 50%;
      animation: lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    }
    .lds-ripple div:nth-child(2) {
      animation-delay: -0.5s;
    }
    @keyframes lds-ripple {
      0% {
        top: 36px;
        left: 36px;
        width: 0;
        height: 0;
        opacity: 0;
      }
      4.9% {
        top: 36px;
        left: 36px;
        width: 0;
        height: 0;
        opacity: 0;
      }
      5% {
        top: 36px;
        left: 36px;
        width: 0;
        height: 0;
        opacity: 1;
      }
      100% {
        top: 0px;
        left: 0px;
        width: 72px;
        height: 72px;
        opacity: 0;
      }
    }
  }


  .poll-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;

    > .poll-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;

      > span {
        display: flex;
        align-items: center;
      }

      > .title {
        font-weight: bold;
        align-self: center;
      }
    }

    > div, > span {
      border: 1px solid black;
      padding: 15px;
    }
  }
</style>
