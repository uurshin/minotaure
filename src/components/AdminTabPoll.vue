<script>
import router, { usePlayerStore } from '../main';
import { ref } from 'vue'
import VueMultiselect from "vue-multiselect";
import {useI18n} from "vue-i18n";

export default {
  components: {
    VueMultiselect
  },
  data() {
    const store = usePlayerStore();
    const { t } = useI18n();
    const nb_options = 0;
    const answers = {};
    const label = '';
    const poll_tab = 'active';
    const open_past_poll = ref(null);
    const poll_show = [];
    const tags_poll = [];

    return {
      store, t, nb_options, answers, label, poll_tab, open_past_poll, poll_show, tags_poll
    }
  },
  mounted() {

  },
  methods: {
    startPoll() {
      const date = Date.now();
      let poll = {
        code: date,
        label: this.label,
        answers: this.answers,
      }
      this.addPoll(poll);
      this.poll_tab = 'active';
    },
    toggle_poll(id_poll) {
      if (this.open_past_poll != null) {
        this.open_past_poll[0].classList.remove('open');
      }
      this.open_past_poll = this.$refs['past_poll_' + id_poll];
      this.open_past_poll[0].classList.add('open');
    },
    finishPoll(id_poll) {
      this.store.polls[id_poll].active = false;
      this.store.characters.forEach(function(character) {
        if (character.polls[id_poll] !== undefined) {
          delete character.polls[id_poll];
        }
      })
      if (this.store.active_polls.length === 0) {
        this.poll_tab = 'past';
      }
    },
    focus(n) {
      if (n === this.nb_options) {
        this.nb_options += 1;
      }
      if (n <= this.nb_options) {
        this.$nextTick(() => {
          this.$refs['choice_' + (n + 1)][0].focus();
        });
      }
    },
    attendance(poll) {
      let count = Object.entries(poll[1].options).map(obj => obj[1].count).reduce((accumulator, current) => accumulator + current, 0);
      if (count === 0) { return 0 }
      else {
        return (100 / poll[1].nb_targets * count).toFixed(2)
      }
    },
    addPoll(poll) {
      const vm = this;
      this.store.polls[poll.code] = {
        label: poll.label,
        active: true,
        options: {}
      };

      for (const key in poll.answers) {
        this.store.polls[poll.code].options[key] = {
          label: poll.answers[key],
          count: 0
        }
      }

      let selectedCharacters
      if (this.tags_poll.length) {
          selectedCharacters = this.store.alive_characters.filter(
              function(character) {
                  return(
                      character.alive &&
                      character.tags.find(
                          (tag) => vm.tags_poll.find((chosen_tag) => chosen_tag.code === tag.code)
                      )
                  )
              }
          );
      }
      else {
        selectedCharacters = this.store.connected_characters(true);
      }

      this.store.polls[poll.code].nb_targets = selectedCharacters.length;
      selectedCharacters.forEach(function(character) {
        character.polls[poll.code] = { label: poll.label, options: poll.answers };
      })
      this.nb_options = 0;
      this.label = '';
      this.answers = {};
    },
    delete_poll(code) {
      delete this.store.polls[code];
    }
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-poll-content'>
      <div class="actions">
        <button @click="poll_tab = 'add'" class="icon-add" :class="{ active:poll_tab === 'add' }" >{{ t("Ajouter un sondage") }}</button>
        <button @click="poll_tab = 'active'" :class="{ active:poll_tab === 'active' }" >{{ t("Voir les sondages actifs") }}</button>
        <button @click="poll_tab = 'past'" :class="{ active:poll_tab === 'past' }" >{{ t("Voir les sondages passés") }}</button>
      </div>

      <div class="vertical-wrapper add-poll" v-if="poll_tab === 'add'">
        <label for="poll_targets">{{ t('Cibles') }}</label>
        <vue-multiselect
            ref="poll_targets"
            id="poll_targets"
            v-model="tags_poll"
            label="label"
            track-by="code"
            group-values="tags"
            group-label="label"
            :group-select="true"
            placeholder="Choisir un tag"
            tagPlaceholder="Choisir un tag"
            noOptions="Tout le monde"
            :options=store.tag_groups
            :multiple="true"
            :taggable="false"
            :hideSelected="true"
        ></vue-multiselect>
        <label for="question">{{ t('Question') }}</label>
        <input @keyup.enter="focus(0)" id="question" v-model=label type='text'>
        <span>{{ t('Choix possibles') }}</span>
        <input :ref="'choice_' + n" @keyup.enter="focus(n)" v-model=answers[n] type='text' v-for="n in nb_options">
        <button @click="nb_options += 1">{{ t('Ajouter un choix') }}</button>
        <button class="btn-valid" :disabled="nb_options < 2 || label === ''" @click="startPoll">{{ t('Lancer le sondage') }}</button>
      </div>

      <div class="vertical-wrapper" v-if="poll_tab === 'active'">
        <div class="list-polls poll-active" :class="{show: poll_show[key]}" v-for="(poll, key) in store.active_polls">
          <span class="title">{{ poll[1].label}}</span>
          <span>{{ t('Participation : ') }}{{ attendance(poll) }}%</span>
          <button @click="poll_show[key] = poll_show[key] !== undefined ? !poll_show[key] : true">{{ t('Montrer les résultats')}}</button>
          <button @click="finishPoll(poll[0])">{{ t('Terminer le sondage') }}</button>
          <div class="results">
            <div v-for="option in Object.entries(poll[1].options).sort(function(a, b) { return b[1].count - a[1].count} )">
              {{ option[1].label }} : {{ option[1].count > 0 ? (100 / poll[1].nb_targets * option[1].count).toFixed(2) : 0 }}%
            </div>
          </div>
        </div>
      </div>
      <div class="vertical-wrapper" v-if="poll_tab === 'past'">
        <div :ref="'past_poll_'+ poll[0]" class="list-polls poll-past" v-for="poll in store.past_polls">
          <div class="wrapper-title">
            <span class="title">{{ poll[1].label}}</span>
            <button class='see-more' @click="toggle_poll(poll[0])">{{ t('Voir plus') }}</button>
            <button class="btn-danger" @click="delete_poll(poll[0])">{{ t('Supprimer') }}</button>
          </div>
          <div v-for="option in Object.entries(poll[1].options).sort(function(a, b) { return a[1].count - b[1].count} )">
            {{ option[1].label }} : {{ option[1].count > 0 ? (100 / poll[1].nb_targets * option[1].count).toFixed(2) : 0 }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .active {
    background-color: var(--success-background);
  }
  .add-poll {
    text-align: left;
  }
  .list-polls {
    display: flex;
    gap: 10px;

    > .wrapper-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;

      > .title {
        font-weight: bold;
      }
    }

    &.poll-active {
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;

      > span, > div {
        flex-basis: 100%;
      }

      .results {
        filter: blur(10px);
        transition: all 1s ease;
      }
      &.show .results {
        filter: blur(0px);
      }
    }
    &.poll-past {
      flex-direction: column;
      align-items: stretch;
      gap: 15px;

      .title {
        margin-right: auto;
      }
      > div:not(.wrapper-title) {
        display: none;
      }
      &.open {
        background: #242424;
        padding: 10px;
        border-radius: 10px;

        > div {
          display: flex;
        }
        .see-more {
          display: none;
        }
      }
    }
  }
</style>