<script>
import router, { usePlayerStore } from '../main';
import { ref } from 'vue'
import VueMultiselect from "vue-multiselect";


export default {
  components: {
    VueMultiselect
  },
  data() {
    const store = usePlayerStore();
    const nb_options = 0;
    const answers = {};
    const label = '';
    const poll_tab = 'active';
    const open_past_poll = ref(null);
    const poll_show = [];
    const tags_poll = [];
    const chosen_tags = [];

    return {
      store, nb_options, answers, label, poll_tab, open_past_poll, poll_show, tags_poll, chosen_tags
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
        active: true
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
      const vm = this;
      this.store.polls[id_poll].active = false;
      this.store.characters.forEach(function(character) {
        if (character.polls[id_poll] !== undefined) {
          if (character.polls[id_poll].answer !== undefined && vm.store.polls[id_poll].options[character.polls[id_poll].answer].tags !== undefined) {
            let new_tags = vm.store.polls[id_poll].options[character.polls[id_poll].answer].tags;
            new_tags.forEach((tag) => character.tags.push(tag));
          }
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
      let count = Object.entries(poll.options).map(obj => obj[1].count).reduce((accumulator, current) => accumulator + current, 0);
      if (count === 0) { return 0 }
      else {
        return (100 / poll.nb_targets * count).toFixed(2)
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
          count: 0,
          tags: this.chosen_tags[key]
        }
      }

      let selectedCharacters
      if (this.tags_poll.length) {
        selectedCharacters = this.store.connected_characters(true).filter((character) => vm.store.filterCharacterByTags(character, vm.tags_poll));
      }
      else {
        selectedCharacters = this.store.connected_characters(true);
      }

      this.store.polls[poll.code].nb_targets = selectedCharacters.length;
      selectedCharacters.forEach(function(character) {
        character.polls[poll.code] = { label: poll.label, options: poll.answers, active: true };
      })
      this.nb_options = 0;
      this.label = '';
      this.tags_poll = [];
      this.chosen_tags = [];
      this.answers = {};
    },
    delete_poll(code) {
      delete this.store.polls[code];
    },
    addTag(tag_label, key) {
      let group = this.store.tag_groups.find((element) => (element.code === 'freetag'));
      if (group === undefined) {
        group = {
          label: this.$t('challenge_tags'),
          code: 'freetag',
          tags: [],
          start: 'none',
        };
        this.store.tag_groups.push(group);
      }
      let tag = this.store.addTag(tag_label, group);
      if (this.chosen_tags[key] === undefined) {
        this.chosen_tags[key] = [];
      }
      this.chosen_tags[key].push(tag);
    },
  }
}
</script>

<template>
  <div class="tab" ref="tab">
    <div id='tab-poll-content'>
      <div class="actions">
        <button @click="poll_tab = 'add'" class="icon-add" :class="{ active:poll_tab === 'add' }" >{{ $t("add_poll") }}</button>
        <button @click="poll_tab = 'active'" :class="{ active:poll_tab === 'active' }" >{{ $t("active_polls") }}</button>
        <button @click="poll_tab = 'past'" :class="{ active:poll_tab === 'past' }" >{{ $t("past_polls") }}</button>
      </div>

      <div class="vertical-wrapper add-poll" v-if="poll_tab === 'add'">
        <div>
          <label for="poll_targets">{{ $t('targets') }}</label>
          <vue-multiselect
              ref="poll_targets"
              id="poll_targets"
              class="left-multiselect"
              v-model="tags_poll"
              label="label"
              track-by="code"
              group-values="tags"
              group-label="label"
              :group-select="true"
              :placeholder="$t('select_tag')"
              :tagPlaceholder="$t('select_tag')"
              :noOptions="$t('everyone')"
              :options=store.tag_groups
              :multiple="true"
              :taggable="false"
              :hideSelected="true"
          ></vue-multiselect>
        </div>
        <div>
          <label for="question">{{ $t('question') }}</label>
          <input @keyup.enter="focus(0)" id="question" v-model=label type='text'>
        </div>
        <div>
          <span>{{ $t('possible_choices') }}</span>
          <div v-for="n in nb_options" class="poll-choice">
            <div>
              <label :for="'choice_' + n">{{ $t('nb_choice', {'nb':n}) }}</label>
              <input :id="'choice_' + n" :ref="'choice_' + n" @keyup.enter="focus(n)" v-model=answers[n] type='text'>
            </div>
            <div>
              <label :for="'chosen_tags_' + n">{{ $t('choice_gives_tag') }}</label>
              <vue-multiselect
                  :id="'chosen_tags_' + n"
                  v-model="chosen_tags[n]"
                  class="left-multiselect"
                  label="label"
                  track-by="code"
                  :tag-placeholder="$t('add_tag')"
                  :placeholder="$t('input_word')"
                  :noOptions="$t('no_tag_create')"
                  group-values="tags"
                  group-label="label"
                  :group-select="false"
                  :options=store.tag_groups
                  :multiple="true"
                  :taggable="true"
                  :hideSelected="true"
                  @tag="addTag($event, n)"
              ></vue-multiselect>
            </div>
          </div>
          <button @click="nb_options += 1">{{ $t('add_poll_choice') }}</button>
        </div>
        <button class="btn-valid" :disabled="nb_options < 2 || label === ''" @click="startPoll">{{ $t('start_poll') }}</button>
      </div>

      <div class="vertical-wrapper" v-if="poll_tab === 'active'">
        <div class="list-polls poll-active" :class="{show: poll_show[key]}" v-for="(poll, key) in store.active_polls">
          <span class="title">{{ poll.label}}</span>
          <span>
            <span>{{ $t('turnout') }}</span>
            <span  :class="{full_attendance: attendance(poll) === '100.00'}">{{ attendance(poll) }}%</span>
          </span>
          <div class="results">
            <div v-for="option in Object.entries(poll.options).sort(function(a, b) { return b[1].count - a[1].count} )">
              {{ option[1].label }} : {{ option[1].count > 0 ? (100 / poll.nb_targets * option[1].count).toFixed(2) : 0 }}%
            </div>
          </div>
          <div class="actions">
            <button @click="poll_show[key] = poll_show[key] !== undefined ? !poll_show[key] : true">{{ $t('show_poll_results')}}</button>
            <button class='btn-danger' @click="finishPoll(key)">{{ $t('close_poll') }}</button>
          </div>
        </div>
      </div>
      <div class="vertical-wrapper" v-if="poll_tab === 'past'">
        <div :ref="'past_poll_'+ key" class="list-polls poll-past" v-for="(poll, key) in store.past_polls">
          <div class="wrapper-title">
            <span class="title">{{ poll.label}}</span>
            <button class='see-more' @click="toggle_poll(key)">{{ $t('see_more') }}</button>
            <button class="btn-danger" @click="delete_poll(key)">{{ $t('delete') }}</button>
          </div>
          <div v-for="option in Object.entries(poll.options).sort(function(a, b) { return b[1].count - a[1].count} )">
            {{ option[1].label }} : {{ option[1].count > 0 ? (100 / poll.nb_targets * option[1].count).toFixed(2) : 0 }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .vertical-wrapper {
    > div {
      background: var(--background-card-color);
      padding: 10px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    input[type=text] {
      height: 40px;
    }
  }

  .poll-choice {
    display: flex;
    gap: 10px;
    align-items: center;

    > div {
      display: flex;
      gap: 10px;
      align-items: center;
    }
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

    .full_attendance {
      color: var(--success-color);
    }

    &.poll-active {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      background: var(--background-card-color);
      border-radius: 10px;
      padding: 10px 15px;

      .results {
        flex-basis: 100%;
        filter: blur(10px);
        transition: all 1s ease;
      }
      &.show .results {
        filter: blur(0px);
      }

      transition: all 0.5s ease-in-out;
      transform-origin: top right;
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
        background: var(--background-card-color);
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