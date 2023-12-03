<script>
import { ref } from 'vue'

export default {
  setup() {
    const current_route = ref('');
    return { current_route } // return render context that included `t`
  },
  data() {
    const current_theme = localStorage.getItem('theme_name');
    return {
      locale: localStorage.getItem('locale_name') ?? this.$i18n.locale,
      themes: ['dark', 'light', 'blue', 'sepia'],
      current_theme: current_theme ?? 'dark',
      theme_picker_open: false,
      root: null
    };
  },
  mounted: function() {
    this.$i18n.locale = this.locale;
    this.root = document.documentElement;
    const theme_name = localStorage.getItem('theme_name');
    document.documentElement.setAttribute('data-theme', theme_name ?? 'dark');
  },
  methods: {
    changeTheme(name) {
      this.current_theme = name;
      localStorage.setItem('theme_name', name);
      document.documentElement.setAttribute('data-theme', name);
      this.theme_picker_open = false;
    },
    changeLocale() {
      this.$i18n.locale = this.locale;
      localStorage.setItem('locale_name', this.locale);
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
      <div class="picker current-theme" :data-theme='this.current_theme' @click="this.theme_picker_open = !this.theme_picker_open"></div>
      <div id="theme-switch" :class="{open: this.theme_picker_open}">
        <div v-for="theme in themes" class="picker" :data-theme='theme' @click="changeTheme(theme)"></div>
      </div>
      <router-link v-if="$route.path !== '/home'" to="/home">{{ $t("back_to_home") }}</router-link>
      <div>
        <select @change="changeLocale()" id="language-switch" v-model="locale">
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

    @include media("<tiny") {
      padding-left: 10px;
      padding-right: 10px;
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
    position: relative;

    .picker {
      width: 20px;
      height: 20px;
      border-radius: 100%;
      outline: 3px solid var(--font-color);

      &:hover {
        outline: 3px solid gold;
      }
    }

    //> :last-child,
    //> :first-child {
    //  flex-grow: 1;
    //  flex-basis: 0;
    //}

    :last-child {
      text-align: right;
    }

    #theme-switch {
      display: flex;
      gap: 10px;
      position: absolute;
      top: -16px;
      opacity: 0;
      transition: opacity 0.3s linear;

      &.open {
        opacity: 1;
      }
    }

    #language-switch {
      height: auto;
      border-radius: 0;
    }
  }
</style>