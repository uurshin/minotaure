import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from "vite-plugin-singlefile"
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import path from 'path'

let default_config = {
  plugins: [vue(), VueI18nPlugin({
    strictMessage: false,
    include: [path.resolve(__dirname, './src/locales/**')]
  }),],
  define: {
    APP_VERSION: JSON.stringify("1.0.0"),
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "./node_modules/include-media/dist/_include-media.scss"; @import "./src/variables.scss";'
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        app: './index.html', // default
      },
    },
    minify: false,
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'offline') {
    default_config.plugins.push(viteSingleFile());
    default_config.build.outDir = 'dist/offline';
    return default_config;
  }

  else if (mode === 'production') {
    default_config.build.outDir = 'dist/online';
    default_config.base = './';
    return default_config;
  }

  else if (mode === 'twitch') {
    default_config.build = {
      rollupOptions: {
        input: {
          app: './index-twitch.html',
        },
      },
      minify: false,
      outDir: 'dist/twitch'
    }
    return default_config;
  }
  return {}
});