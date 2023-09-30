<script>
  import router, { usePlayerStore } from '../main';
  import QrcodeVue from 'qrcode.vue'
  import { QrcodeStream, QrcodeDropZone, QrcodeCapture } from 'vue-qrcode-reader'
  import {useI18n} from "vue-i18n";

  export default {
    components: {
      QrcodeVue,
      QrcodeStream,
      QrcodeDropZone,
      QrcodeCapture
    },
    setup() {
      const { t } = useI18n()
      const store = usePlayerStore();
      return { t, store }
    },
    data() {
      return {
        paused: false,
        type_action: null,
        characters: JSON.parse(localStorage.getItem('games_player')) ?? null,
        characters_string: localStorage.getItem('games_player') ?? null,
      }
    },
    mounted() {

    },
    methods: {
      async onDetect(firstDetectedCode) {
        if (firstDetectedCode[0].rawValue !== undefined) {
          let parsed = JSON.parse(firstDetectedCode[0].rawValue);
          let result = [];
          if (parsed !== null && parsed.length) {
            parsed.forEach(function(character) {
              if (character.game_token !== undefined && character.character_token !== undefined) {
                result.push({'game_token': character.game_token, 'character_token': character.character_token });
              }
            });
            alert(this.$t('count_personnage_import', {count_import: result.length}));
            localStorage.setItem('games_player', JSON.stringify(result));

            this.characters = JSON.parse(localStorage.getItem('games_player'));
            this.characters_string =  localStorage.getItem('games_player');
            return;
          }
        }

        alert(this.$t('QR code invalide'));
        this.paused = true
        await this.timeout(500)
        this.paused = false
      },
      timeout(ms) {
        return new Promise((resolve) => {
          window.setTimeout(resolve, ms)
        })
      },
      deleteAllCharacters() {
        this.characters = null;
        localStorage.removeItem('games_player');
      }
    }
  }
</script>

<template>
  <h1>{{ t("Gérer vos personnages") }}</h1>
  <div class="small-wrapper">
    <div>{{ t('Characters help') }}</div>
    <div>{{ t('Characters nb', characters !== null ? characters.length : 0)}}</div>
    <button v-if="characters !== null" @click="type_action = 'export'">{{ t("Exporter vos personnages") }}</button>
    <button @click="type_action = 'import'">{{ t("Importer vos personnages") }}</button>
    <button v-if="characters !== null" class='btn-danger' @click="deleteAllCharacters">{{ t("Supprimer tous vos personnages") }}</button>

    <div id="export" v-if="type_action === 'export'">
      <div class="qr-code">
        <qrcode-vue :value="characters_string" :size="200" level="H" />
      </div>
    </div>
    <div id="import" v-if="type_action === 'import'">
      <qrcode-stream :paused="paused" @detect="onDetect"></qrcode-stream>
    </div>
  </div>
</template>

<style lang="scss">
  .qr-code {
    border: 3px solid white;
    display: inline-block;
  }
</style>
