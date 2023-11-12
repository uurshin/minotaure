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
    const open_poll = null;
    const poll_show = [];
    const tags_poll = [];
    const chosen_tags = [];
    const name_draft = '';
    const draft_in_progress = false;

    return {
      store, nb_options, answers, label, poll_tab, open_poll, poll_show, tags_poll, chosen_tags, name_draft, draft_in_progress
    }
  },
  computed: {
    isNewPollInvalid: function() {
      if (this.nb_options < 2 || this.label === '') return true;
      let nb_valid = 0;
      for (let i = 1; i < this.nb_options + 1; i++) {
        if ((this.answers[i] === '' || this.answers[i] === undefined) && (this.chosen_tags[i] !== undefined && this.chosen_tags[i].length > 0)) {
          return true;
        }
        if (this.answers[i] !== '' && this.answers[i] !== undefined) {
          nb_valid += 1;
        }
      }
      return nb_valid < 2;
    },
  },
  mounted() {

  },
  methods: {
    startPoll() {
      const vm = this;
      let poll = this.addPoll();

      let selectedCharacters
      if (this.tags_poll.length) {
        selectedCharacters = this.store.connected_characters(true).filter((character) => vm.store.filterCharacterByTagsAndPicked(character, vm.tags_poll));
      }
      else {
        selectedCharacters = this.store.connected_characters(true);
      }

      poll.nb_targets = selectedCharacters.length;
      let answers = {};
      Object.entries(poll.options).forEach((option) => answers[option[0]] = option[1].label)

      selectedCharacters.forEach(function(character) {
        character.polls[poll.code] = { label: poll.label, options: answers, active: true };
      })

      this.poll_tab = 'active';
    },
    togglePoll(id_poll) {
      if (this.open_poll === id_poll) {
        this.open_poll = null;
      }
      else {
        this.open_poll = id_poll;
      }
    },
    finishPoll(id_poll) {
      const vm = this;
      this.store.polls[id_poll].active = -1;
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
    addPoll(draft = false) {
      const date = Date.now();
      this.store.polls[date] = {
        code: date,
        label: this.label,
        active: draft ? 0 : 1,
        name: draft ? this.name_draft : '',
        options: {}
      };

      for (const key in this.answers) {
        if (this.answers[key] !== '') {
          this.store.polls[date].options[key] = {
            label: this.answers[key],
            count: 0,
            tags: this.chosen_tags[key]
          }
        }
      }

      this.resetPoll();

      return this.store.polls[date];
    },
    deletePoll(code) {
      delete this.store.polls[code];
    },
    saveDraftPoll() {
      this.addPoll(true);
      this.poll_tab = 'draft';
      this.draft_in_progress = false;
      this.name_draft = '';
    },
    loadPoll(code, destroy = true) {
      const vm = this;
      let poll = this.store.polls[code];
      this.label = poll.label;
      Object.entries(poll.options).forEach(function(option) {
        vm.answers[option[0]] = option[1].label;
        vm.chosen_tags[option[0]] = option[1].tags;
      });
      this.nb_options = Object.entries(poll.options).length;
      this.poll_tab = 'add';
      if (destroy) {
        this.deletePoll(code);
      }
    },
    resetPoll() {
      this.nb_options = 0;
      this.label = '';
      this.tags_poll = [];
      this.chosen_tags = [];
      this.answers = {};
    },
    addTag(tag_label, key) {
      let group = this.store.tag_groups.find((element) => (element.code === 'freetag'));
      if (group === undefined) {
        group = this.store.addGroupTag(true);
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
        <button @click="poll_tab = 'draft'" :class="{ active:poll_tab === 'draft' }" >{{ $t("drafted_polls") }}</button>
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
              :options=store.tag_groups_plus_targets
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
              <label :for="'choice_' + n">{{ $t('nb_choice', {'nb': n}) }}</label>
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
        <div class="poll-group-btn" v-if="!draft_in_progress">
          <button class="btn-valid" :disabled="isNewPollInvalid" @click="startPoll">{{ $t('start_poll') }}</button>
          <button @click="draft_in_progress = true" :disabled="isNewPollInvalid">{{ $t('save_draft_poll') }}</button>
          <button class='cancel-poll btn-danger' @click="resetPoll">{{ $t('cancel') }}</button>
        </div>
        <div class="poll-group-btn" v-else>
          <label for="name_draft">{{ this.$t('choose_name_draft') }}</label>
          <input type="text" id="name_draft" v-model="name_draft"/>
          <button class="btn-valid" @click="saveDraftPoll()">{{ $t('save_draft_poll') }}</button>
          <button class='cancel-poll btn-danger' @click="draft_in_progress = false">{{ $t('cancel') }}</button>
        </div>
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

      <div class="vertical-wrapper wrapper-poll-draft" v-if="poll_tab === 'draft'">
        <div :class="{open: (key === open_poll)}" class="list-polls poll-past" v-for="(poll, key) in store.drafted_polls">
          <div class="wrapper-title">
            <span class="title">{{ poll.name}}</span>
            <button class='see-more' @click="togglePoll(key)">{{ (key === open_poll) ? $t('see_less') : $t('see_more') }}</button>
            <button class="btn-valid" @click="loadPoll(key)">{{ $t('load_poll') }}</button>
            <button class='btn-danger' @click="deletePoll(key)">{{ $t('delete') }}</button>
          </div>
          <div>{{ $t('question_label') }}{{ poll.label}}</div>
          <div v-for="(option, key) in Object.entries(poll.options)">
            {{ $t('nb_choice_label', {'nb': key + 1}) }}{{ option[1].label }}
          </div>
        </div>
      </div>

      <div class="vertical-wrapper" v-if="poll_tab === 'past'">
        <div :class="{open: (key === open_poll)}" class="list-polls poll-past" v-for="(poll, key) in store.past_polls">
        <div class="wrapper-title">
            <span class="title">{{ poll.label}}</span>
            <button class='see-more' @click="togglePoll(key)">{{ $t('see_more') }}</button>
            <button @click="loadPoll(key, false)">{{ $t('load_poll') }}</button>
            <button class="btn-danger" @click="deletePoll(key)">{{ $t('delete') }}</button>
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
    &.wrapper-poll-draft {
      counter-set: poll;

      > div {
        .title {
          display: flex;
          gap: 10px;

          &:before {
            content: counter(poll);
            counter-increment: poll;
            padding: 5px;
            border-radius: 100%;
            background: var(--font-color);
            color: var(--inverse-font-color);
            align-self: baseline;
            width: 20px;
            height: 20px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
    }

    > div {
      background: var(--background-card-color);
      padding: 10px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 15px;

      &.poll-group-btn {
        flex-direction: row;
        align-items: center;
        input, button {
          flex: 0 0 auto;
        }
        .cancel-poll {
          margin-left: auto;
        }
      }
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
        //.see-more {
        //  display: none;
        //}
      }
    }
  }
</style>