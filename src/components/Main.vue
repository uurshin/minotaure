<script>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n';
import router from '../main';

export default {
  setup() {
    const current_route = ref('');
    const { t } = useI18n() // call `useI18n`, and spread `t` from  `useI18n` returning
    return { t, current_route } // return render context that included `t`
  },
  data() {
    return {
      themes: ['dark', 'light', 'blue'],
      root: null
    };
  },
  mounted: function() {
    this.root = document.documentElement;
    const theme_name = localStorage.getItem('theme_name');
    document.documentElement.setAttribute('data-theme', theme_name ?? 'dark');
  },
  methods: {
    changeTheme(name) {
      localStorage.setItem('theme_name', name);
      document.documentElement.setAttribute('data-theme', name);
    }
  },
}
</script>

<template>
  <div id="main">
    <div class="main-wrapper" ref="main">
      <router-view></router-view>
    </div>
    <div class="options-switch">
      <div id="theme-switch">
        <div v-for="theme in themes" class="picker" :data-theme='theme' @click="changeTheme(theme)"></div>
      </div>
      <router-link v-if="$route.path !== '/home'" to="/home">Retourner à l'accueil</router-link>
      <div>
        <select id="language-switch" v-model="$i18n.locale">
          <option v-for="locale in $i18n.availableLocales">{{ locale }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  #main {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    @include media("<tablet") {
      padding-left: 30px;
      padding-right: 30px;
    }

    > a {
      margin-top: auto;
      margin-bottom: 30px;
    }
  }

  .main-wrapper {
    margin-top: auto;

    &.wide {
      align-self: stretch;
      margin-top: 0;
    }
  }

  .options-switch {
    margin-top: auto;
    display: flex;
    align-self: stretch;
    justify-content: space-between;
    padding: 15px;

    > :last-child,
    > :first-child {
      flex-grow: 1;
      flex-basis: 0;
    }

    :last-child {
      text-align: right;
    }

    #theme-switch {
      display: flex;
      gap: 10px;

      > div {
        width: 20px;
        height: 20px;
        border-radius: 100%;

        outline: 3px solid var(--font-color);

        &:hover {
          outline: 3px solid gold;
        }
      }
    }

    #language-switch {
      height: auto;
      border-radius: 0;
    }
  }
</style>