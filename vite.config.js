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
    APP_VERSION: JSON.stringify("1.2.0"),
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "./node_modules/include-media/dist/_include-media.scss"; @import "./src/assets/css/variables.scss";'
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        app: './index.html',
      },
    },
    minify: false,
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    default_config.build.outDir = 'dist/single';
    default_config.plugins.push(viteSingleFile());
    default_config.css.preprocessorOptions.scss.additionalData += '@import "./src/assets/css/font_single.scss";';
    return default_config;
  }

  else if (mode === 'multiple') {
    default_config.build.outDir = 'dist/multiple';
    default_config.base = './';
    default_config.css.preprocessorOptions.scss.additionalData += '@import "./src/assets/css/font_multiple.scss";';
    return default_config;
  }

  return {}
});
