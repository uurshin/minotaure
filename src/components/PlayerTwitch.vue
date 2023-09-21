<script>
import router, { usePlayerStore } from '../main_twitch';
import { ref } from 'vue'

export default {
  setup() {
    const character = ref({});
    const freeze = ref(false);
    return {
      freeze, character
    }
  },
  data() {
    return {
      option_picked: [],
      name_picked: '',
      creation_form: false,
      gameStart: false
    }
  },
  beforeMount() {
    const store = usePlayerStore();

    // Reprise d'une partie après un refresh
    window.addEventListener("beforeunload", event => {
      if (store.connection !== null) {
        localStorage.setItem('temp_peer', true);
        store.connection.close();
        store._leaving = true;
      }
    })
  },
  mounted() {
    this.freeze = true;
    const store = usePlayerStore();
    store._leaving = false;
    if (store.temp_peer !== null) {
      this.handshake();
    }
    else {
      window.Twitch.ext.onError(function(t) {
        console.log(t)
      })
      window.Twitch.ext.onAuthorized(auth => {
        // the page has loaded and is ready
        loadConfig();
      });
      window.Twitch.ext.configuration.onChanged(() => {
        loadConfig();
      });
      function loadConfig() {
        let broadcaster_config = window.Twitch.ext.configuration.broadcaster;
        console.log('broadcaster');
        console.log(broadcaster_config);
        if (broadcaster_config && broadcaster_config.content) {
          try{
            broadcaster_config.content = JSON.parse(broadcaster_config.content);
            if (broadcaster_config.content.id_admin !== undefined) {
              store.join(broadcaster_config.content.id_admin);
            }
            else {
              console.log('no config detected');
            }
          }
          catch (e) {}
        }
      }
    }

    store.$subscribe((mutation, state) => {
      console.log('subscribe trigger');
      if (store.connection !== null && store.temp_peer !== null) {
        console.log('subscribe trigger OK');
        store.setTempPeer(null);
        this.handshake();
      }
    })
  },
  methods: {
    handshake() {
      const store = usePlayerStore();
      store._leaving = false;
      let vm = this;

      // 1. Début de la poignée de main.
      console.log('handshake')
      console.log(store.peer.id);
      store.connection.send({
        handshake: 'readyForCall'
      });

      console.log('readyfortransaction')

      store.connection.on('close', function() {
        vm.freeze = true;
        if (!store.leaving) {
          store._leaving = false;
          const myTimeout = setTimeout(function() {
            console.log('reconnection attempted');
            store.join(store.connection.peer, true);
          }, 500);
        }
      });

      store.connection.on('data', function (data) {
        if (data.handshake !== undefined) {
          console.log(data.handshake);
          // 2. Réception des données de la partie.
          if (data.handshake === 'gameWait') {
            vm.gameStart = false;
          }

          if (data.handshake === 'gameStart' || data.handshake === 'refresh') {
            vm.gameStart = true;
            let games = localStorage.getItem('games_player');
            let found;
            if (games !== null) {
              games = JSON.parse(games);
              found = games.find((element) => element.game_token === data.game_token);
            }

            // 3. Partie trouvée, envoi du token du joueur.
            if (found !== undefined) {
              store.connection.send({handshake: 'readyForCharacter', token: found.character_token});
            }
            // 3bis. Partie introuvable, envoi du signal seulement.
            else {
              store.connection.send({handshake: 'readyForCharacter'});
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
            let games = localStorage.getItem('games_player');
            let found = -1;
            if (games !== null) {
              games = JSON.parse(games);
              found = games.findIndex((element) => element.game_token === data.game_token);
            }
            else {
              games = [];
            }

            // 5bis. La partie n'existe pas, il faut la créer et stocker le personnage.
            if (found === -1) {
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
      store.peer.on('call', function(call) {
        call.answer();

        call.on('stream', function(stream) {
          const video = document.querySelector("video");
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play();
          };
        });
      });
    },
    sendCharacter() {
      const store = usePlayerStore();
      let vm = this;

      store.connection.send({
        handshake: 'characterChoices',
        choices: this.option_picked,
        name: this.name_picked,
        token: vm.character.token
      });
    }
  }
}
</script>

<template>
  <div id="player-sheet" class="small-wrapper" :class="{ disabled: freeze }">
    <div class="lds-ripple"><div></div><div></div></div>
    <div class="game-wait" v-if="!gameStart">En attente du démarrage de la partie</div>
    <div id="creation" class="vertical-wrapper" v-if="creation_form">
      <label for="name">Nom de votre personnage</label>
      <input type="text" id="name" v-model="name_picked"/>
      <template v-for="(option, group_key) in creation_form.options">
        <div class="group-choice">
          <label :for="'tag-group-' + group_key">Votre personnage est </label>
          <select :id="'tag-group-' + group_key" v-model="option_picked[group_key]">
            <option v-for="(value, key, index) in option.tags" :value="value.code">
              {{ value.label }}
            </option>
          </select>
        </div>
      </template>
      <button @click="sendCharacter()">Valider votre personnage</button>
    </div>
    <div class="vertical-wrapper" id="sheet" v-if="!creation_form && character.alive">
      <span class="character-name">{{ character.name }}</span>
      <div>
        <span v-for="gauge in character.gauges">
          <span>{{ gauge.label }}</span><span class="indicator">{{ gauge.value }}</span></span>
      </div>
      <div>
        <span v-for="stat in character.stats">
          <span>{{ stat.label }}</span><span class="indicator">{{ stat.value }}</span></span>
      </div>
      <div>
        <span v-for="tag in character.tags">{{ tag }}</span>
      </div>
    </div>
    <div class="vertical-wrapper" v-if="!creation_form && !character.alive">
      <span class="character-name">{{ character.name }} est mort</span>
    </div>
    <video v-if="!creation_form"></video>
  </div>
</template>

<style lang="scss">
  body {
    @font-face {
      font-family: "Ubuntu";
      src: url('../assets/fonts/Ubuntu-Regular.ttf');
    }
    @font-face {
      font-family: "Ubuntu";
      src: url('../assets/fonts/Ubuntu-Medium.ttf');
      font-weight: 500;
    }
    @font-face {
      font-family: "Ubuntu";
      src: url('../assets/fonts/Ubuntu-Bold.ttf');
      font-weight: 700;
    }
  }
  #app {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .game-wait {
    color: white;
  }
  #player-sheet {
    display: flex;
    border-radius: 10px;
    color: black;
    border: 1px solid black;
    flex-direction: column;
    gap: 10px;
    background: #EEE;
    padding: 10px;
    align-items: center;
    justify-content: center;

    .character-name {
      font-size: 1.5em;
    }

    #sheet {
      width: 90%;

      > div {
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
</style>
