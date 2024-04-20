<script>
import router, { usePlayerStore } from '../main';
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
    const store = usePlayerStore();
    return {
      store,
      option_picked: [],
      name_picked: '',
      pseudo_picked: '',
      number_picked: '',
      creation_form: false,
      gameStart: false,
      answers: [],
      date: 0
    }
  },
  beforeMount() {
    // Necessary storage to allow recover the game after a page refresh.
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
    },
    hasChallenge: function() {
      return this.character.challenge !== undefined && Object.entries(this.character.challenge).length;
    },
    challengeTimer () {
      let time_remaining = this.character.challenge.timer - Math.floor((this.date - this.character.challenge.date) / 1000);
      return (time_remaining <= 0 ? 0 : time_remaining);
    },
    challengeInProgress() {
      return this.challengeTimer > 0 && this.character.challenge.wait_roll;
    },
    difficulty() {
      let difficulty = this.character.stats[this.character.challenge.stat].value - this.character.challenge.difficulty;
      // 1 is always a success.
      if (difficulty < 1) {
        return 1;
      }
      // 20 is always a failure.
      else if (difficulty > 19) {
        return 19;
      }
      return difficulty;
    },
    hasSpendingButtons() {
      const vm = this;
      if (this.difficulty === 19) {
        return false;
      }
      return Object.entries(this.character.gauges).some(function(gauge) {
        if (vm.character.challenge.spendable[gauge[0]] !== undefined && (gauge[1].deadly ? gauge[1].value > 1 : gauge[1].value > 0)) {
          return true;
        }
      });
    }
  },
  mounted() {
    const vm = this;
    this.store.stopReconnect();
    this.freeze = true;
    this.store._leaving = false;
    this.store.setTempPeer( localStorage.getItem('temp_peer'));
    let gm_id = localStorage.getItem('gm_id');

    // A refresh has happened, recover the game.
    if (this.store.peer == null || this.store.temp_peer !== null) {
      this.store.join(gm_id, true);
    }
    // It's a first connection, start the handshake with the host.
    else {
      this.handshake();
    }

    // Special handshake for page refresh.
    this.store.$subscribe((mutation, state) => {
      if (this.store.connection !== null && this.store.temp_peer !== null) {
        this.store.setTempPeer(null);
        this.handshake();
      }
    })

    setInterval(vm.updateClock, 1000);
  },
  methods: {
    handshake() {
      let vm = this;
      this.store._leaving = false;

      // 1. Start of the handshake between host and player.
      console.log('Minotaure : handshake received')
      console.log(this.store.peer.id);

      this.store.connection.send({
        handshake: 'readyForCall',
        version: APP_VERSION
      });

      console.log('Minotaure : ready for transaction');

      this.store.connection.once('close', function() {
        console.log('Minotaure - connection closed');
        vm.freeze = true;
        if (!vm.store.leaving) {
          vm.store._leaving = false;
          if (vm.store.should_reconnect === -1) {
            router.push('/join');
            vm.store.setMessage('Partie terminée');
          }
          else if (vm.store.should_reconnect === 0) {
            vm.store.startReconnect();
          }
        }
      });

      // 2. Receiving data from the host.
      this.store.connection.on('data', function (data) {
        console.log('data received');

        if (data.handshake !== undefined) {
          console.log(data.handshake);

          // Host and player versions are not compatible.
          if (data.handshake === 'versionError') {
            vm.store.setShouldReconnect(-1);
            vm.store.connection.close();
            vm.store.setMessage('Version incompatible');
          }

          // The host disconnected manually and tells the player what a disconnect will soon arrive.
          if (data.handshake === 'disconnectGracefully') {
            vm.store.setShouldReconnect(-1);
          }
          // 3a. Game is online but not started.
          else if (data.handshake === 'gameWait') {
            vm.gameStart = false;
          }
          // 3b. Game is online and started.
          else if (data.handshake === 'gameStart') {
            vm.gameStart = true;

            let found = vm.findGame(data.game_token);

            // 4a. Game found, sending back the player token to the host.
            if (found !== undefined) {
              vm.store.connection.send({handshake: 'readyForCharacter', token: found.character_token});
            }
            // 4b. Game not found, sending back the signal that we want a new character.
            else {
              vm.store.connection.send({handshake: 'readyForCharacter'});
            }
          }

          // 5. New character received, display the creation form.
          else if (data.handshake === 'initCharacter') {
            let games = vm.getLocalGames();
            let foundIndex = games.findIndex((element) => element.game_token === data.game_token);
            if (foundIndex > -1) {
              games.splice(foundIndex, 1);
              localStorage.setItem('games_player', JSON.stringify(games));
            }

            vm.gameStart = true;
            vm.freeze = false;
            vm.creation_form = data.creation_form;
          }

          // 6. Character created, display the character sheet.
          else if (data.handshake === 'displayCharacter') {
            vm.gameStart = true;
            vm.freeze = false;

            let found = vm.findGame(data.game_token)

            // 7. The game doesn't exist, create it and link the character to it.
            if (found === undefined) {
              let games = vm.getLocalGames();
              games.push({
                game_token: data.game_token,
                character_token: data.character.token
              })
              localStorage.setItem('games_player', JSON.stringify(games));
            }

            // 7b. Hide the creation from if needed and display the character.
            vm.creation_form = false;
            vm.character = data.character;
          }
        }
      });
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
          token: vm.character.token,
          number: this.number_picked
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
    roll() {
      let vm = this;
      this.store.connection.send({
        handshake: 'roll',
        data: {},
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
    },
    classesChallenge: function() {
      if (this.character.challenge !== undefined && Object.entries(this.character.challenge).length) {
        if (this.character.challenge.result) {
          if (this.character.challenge.result === 'success') {
            return ['received', 'challenge-success'];
          }
          else {
            return ['received', 'challenge-failure'];
          }
        }
        else if (this.character.challenge.wait_roll) {
          return ['wait-roll']
        }
      }
      else {
        return {};
      }
    },
    updateClock() {
      this.date = Date.now();
    },
    spendGauge(key) {
      const vm = this;
      this.store.connection.send({
        handshake: 'spendGauge',
        code: key,
        token: vm.character.token,
      });
    }
  },
}
</script>

<template>
  <span class="game-name" v-if="character.game_name !== undefined">{{ character.game_name }}</span>
  <div id="player-sheet" class="small-wrapper" :class="{ disabled: freeze, flipped: hasChallenge || activePolls}">
    <div class="frontface">
      <div v-if="!gameStart || freeze" class="vertical-wrapper waiting">
        <div class="ripple"><div></div><div></div></div>
        <div class="game-wait">{{ !gameStart ? $t("waiting_for_game_start") : $t("temporary_disconnected") }}</div>
      </div>

      <div id="creation" class="vertical-wrapper" v-if="creation_form">
        <label for="name">{{ $t("char_name") }}</label>
        <input maxlength="12" type="text" id="name" v-model="name_picked" @keyup.enter="this.$refs['pseudo'].focus()" />
        <label for="pseudo">{{ $t("user_name") }}</label>
        <input ref="pseudo" maxlength="12" type="text" id="pseudo" v-model="pseudo_picked" @keyup.enter="sendCharacter()" />
        <label for="number">Numéro de badge</label>
        <input ref="number" type="number" v-model="number_picked" @keyup.enter="sendCharacter()" />

        <template v-for="(option, group_key) in creation_form.options">
          <div class="group-choice">
            <label :for="'tag-group-' + group_key">{{ $t("your_char") }}</label>
            <select :id="'tag-group-' + group_key" v-model="option_picked[group_key]">
              <option v-for="(value, key, index) in option.tags" :value="value.code">
                {{ value.label }}
              </option>
            </select>
          </div>
        </template>
        <button :disabled="characterIsInvalid" @click="sendCharacter()" class="btn-valid">{{ $t("submit_your_char") }}</button>
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
          <span :style="{ borderColor: 'hsl(' + tag.color[0] + ',' + tag.color[1] + '%' + ',' + tag.color[2] + '%)' }" v-for="tag in character.tags">{{ tag.label }}</span>
        </div>
      </div>
      <div class="vertical-wrapper" v-else>
        <span class="character-name">{{ $t('is_dead', {charname: character.name}) }}</span>
        <button @keyup.enter="newCharacter" @click="newCharacter">{{ $t('create_new_char') }}</button>
      </div>
    </div>
    <div class="backface">
      <div id="challenge" class="vertical-wrapper" v-if="character.challenge !== undefined && Object.entries(character.challenge).length">
        <div class="challenge-in-progress">
          <span class="wrapper-label">
            {{ $t(challengeInProgress ? 'challenge_in_progress' : 'challenge_done', {label: character.stats[character.challenge.stat].label}) }}
          </span>
          <span v-if="challengeInProgress" class="timer">{{ $t('challenge_ends_in', {timer: challengeTimer}) }}</span>
          <span v-if="challengeInProgress">{{ $t('difficulty_threshold' , {difficulty: difficulty}) }}</span>
          <span v-else>{{ $t('difficulty_threshold_past', {difficulty: character.challenge.locked_difficulty}) }}</span>
        </div>
        <div class="die-wrapper">
          <div class="die" :class="classesChallenge()">
            <div class="frontface">
              <button @click="roll()">
                {{ $t('roll') }}
              </button>
            </div>
            <div class="backface">
              <span v-if="character.challenge.roll !== undefined">{{ character.challenge.roll }}</span>
            </div>
          </div>
        </div>
        <div class="challenge-done">
          <div v-if="challengeInProgress && hasSpendingButtons" class="container-modifiers">
            <span>{{ $t('gauge_spending_description') }}</span>
            <template v-for="(gauge, key) in character.gauges">
              <button v-if="character.challenge.spendable[key] !== undefined && (gauge.deadly ? gauge.value > 1 : gauge.value > 0)" @click="spendGauge(key)" class="btn-valid" >
                {{ $t('gauge_spending_button_text', {label: gauge.label, current: gauge.value, modifier: character.challenge.spendable[key] }) }}
              </button>
            </template>
          </div>
          <Transition>
            <ul v-if="character.challenge.roll !== undefined">
              <li v-for="message in character.challenge.message">{{ message }}</li>
            </ul>
          </Transition>
        </div>
      </div>
      <div class="vertical-wrapper polls" v-if="activePolls">
        <div :class="{waiting: poll.active && poll.answer === undefined}" class="poll-wrapper" v-for="(poll, key, index) in character.polls">
          <div class="poll-content" v-if="poll.active && poll.answer === undefined">
            <span class="wrapper-label">{{ $t('poll_in_progress')}}</span>
            <span class="title">{{ poll.label }}</span>
            <div class="radios-wrapper">
              <div class="radio-wrapper" v-for="(option, poll_key) in poll.options">
                <input type="radio" :value="poll_key" :name="'poll_' + key" :id="'poll_' + key + '_' + poll_key" v-model="answers[key]">
                <label :for="'poll_' + key + '_' + poll_key">{{ option }}</label>
              </div>
            </div>
            <button :disabled="answers[key] === undefined" @click="sendAnswer(key)">{{ $t("send_answer") }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  input {
    height: auto;
  }

  .game-name {
    font-size: 1.2em;
    margin-top: 20px;
  }

  #player-sheet {
    display: grid;
    border-radius: 10px;
    color: var(--font-color);
    gap: 10px;
    margin-top: 20px;
    transform-style: preserve-3d;
    transition: all 1s ease-in-out;
    rotate: y 0deg;

    > .frontface {
      rotate: y 0deg;
      translate: 0 0 1px;
      align-items: center;
    }
    > .backface {
      rotate: y 180deg;
      translate: 0 0 -1px;
      align-items: stretch;
      display: flex;
      flex-direction: column;
    }

    > .backface, > .frontface {
      grid-area: 1 / 1;
      background: var(--background-card-color);
      padding: 10px;
      display: flex;
      justify-content: center;
      transform-style: preserve-3d;
      border-radius: 20px;
      min-width: 280px;
      backface-visibility: hidden;

      &:after {
        content: '';
        background: var(--background-card-color);
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        translate: 0 0 -1px;
        transform-style: preserve-3d;
        border-radius: 30px;
      }
    }

    &.flipped {
      rotate: y 180deg;
    }

    input {
      border: 1px solid var(--border-color);
    }

    .character-names {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .character-name {
        font-size: 1.5em;
      }
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      flex-direction: row;
      gap: 10px;

      > span {
        border-radius: 10px;
        background: var(--player-tag-background);
        color: var(--player-tag-color);
        padding: 5px;
        text-align: center;
        text-transform: capitalize;
        border-style: solid;
        border-width: 4px;
      }
    }

    .waiting {
      align-items: center;
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
      border-radius: 15px;
      background: var(--button-background);
      color: var(--button-color);
      min-width: 24px;
    }

    &.disabled {
      background: none;
      border: none;

      .vertical-wrapper:not(.waiting) {
        display: none;
      }
      .ripple {
        display: inline-block;
      }
    }

    #challenge {
      display: grid;
      grid-auto-rows: 1fr;

      + .polls {
        border-top: 2px solid white;
        padding-top: 15px;
      }

      .challenge-done,
      .challenge-in-progress {
        display: flex;
        flex: 1;
        flex-direction: column;
        justify-content: flex-end;
        gap: 10px;
      }

      .challenge-done {
        justify-content: flex-start;
      }

      .die-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;

        .die {
          display: inline-block;
          transform-style: preserve-3d;
          perspective: 200px;
          width: 100px;
          height: 100px;
          margin: 0 auto;
          transition: 1s all ease-in-out;
          rotate: y 0deg;
          border-radius: 50%;
          background: #c7c7c7;

          &.challenge-success {
            background: var(--success-background);
          }
          &.challenge-failure {
            background: var(--failure-background);
          }
          &.wait-roll {
            .frontface:after {
              content: "";
              animation: 0.5s linear 1s infinite alternate wait_roll;
              width: 120%;
              height: 120%;
              background: var(--font-color);
              position: absolute;
              translate: 0 0 -1px;
              z-index: -18;
              border-radius: 100%;
              opacity: 0;
            }

            &:hover .frontface:after {
              animation-play-state: paused;
              translate: 0 0 -2px !important;
              transition: all 0.3s linear;
              opacity: 1;
            }
          }
          &.received {
            rotate: y 180deg;
          }

          > div {
            position: absolute;
            display: flex;
            width: 100px;
            height: 100px;
            align-items: center;
            justify-content: center;
            color: black;
            transform-style: preserve-3d;
            transition: all 1s ease-in-out;

            &.frontface {
              rotate: y 0deg;
            }

            &.backface {
              rotate: y 180deg;
              font-size: 53px;
            }

            > button,
            > span {
              font-weight: bold;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: translateZ(30px);
              transform-style: preserve-3d;
            }

            > span {
              color: white;
            }

            > button {
              font-size: 19px;
              color: black;
              border: unset;
              border-radius: 100%;
              background: none;
              text-transform: uppercase;
              transition: unset;
              outline: none;
            }
          }
        }
      }
    }

    .ripple {
      display: none;
      position: relative;
      width: 80px;
      height: 80px;

      div {
        position: absolute;
        border: 4px solid var(--font-color);
        opacity: 1;
        border-radius: 50%;
        animation: lds-ripple 1s ease-in-out infinite;

        &:nth-child(2) {
          animation-delay: -0.5s;
        }
      }
    }

    .wrapper-label {
      font-size: 1.2em;
      font-weight: bold;
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
    align-items: stretch;
    gap: 10px;

    &:not(.waiting) {
      display: none;
    }

    &.waiting + .poll-wrapper {
      border-top: 2px solid white;
      padding-top: 15px;
    }

    > .poll-content {
      display: flex;
      flex-direction: column;
      align-self: center;
      gap: 30px;

      > span {
        display: flex;
        align-items: center;
      }

      > .title {
        font-weight: bold;
        align-self: center;
      }
    }
  }

  .group-choice {
    select {
      -webkit-appearance: none;
      -moz-appearance: none;
      background: white;
      background-image: url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
      background-repeat: no-repeat;
      background-position-x: 100%;
      padding: 0 25px 0 5px;
      border: 1px solid var(--border-color);
    }
  }

  .container-modifiers {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    gap: 10px;
    align-items: stretch;

    > span {
      max-width: 230px;
      margin: auto;
    }
  }

  @keyframes wait_roll {
    from {
      opacity: 1;
      translate: 0 0 -30px;
    }
    to {
      opacity: 1;
      translate: 0 0 -3px;
    }
  }

  .radios-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
