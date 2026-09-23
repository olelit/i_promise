<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getWebApp, mockUser, type TelegramThemeParams } from './telegram'

const webApp = getWebApp()
const isTelegram = webApp !== undefined
const user = webApp?.initDataUnsafe.user ?? mockUser
const theme = ref<TelegramThemeParams>({})

function applyTheme(): void {
  theme.value = webApp?.themeParams ?? {}
}

const themeStyle = computed(() => ({
  '--tg-bg': theme.value.bg_color ?? '#ffffff',
  '--tg-text': theme.value.text_color ?? '#000000',
  '--tg-hint': theme.value.hint_color ?? '#707579',
  '--tg-button': theme.value.button_color ?? '#2481cc',
  '--tg-button-text': theme.value.button_text_color ?? '#ffffff',
  '--tg-secondary-bg': theme.value.secondary_bg_color ?? '#f4f4f5',
}))

onMounted(() => {
  if (!webApp) {
    return
  }
  webApp.ready()
  webApp.expand()
  applyTheme()
  webApp.onEvent('themeChanged', applyTheme)
})

onUnmounted(() => {
  webApp?.offEvent('themeChanged', applyTheme)
})
</script>

<template>
  <div class="app" :style="themeStyle">
    <div v-if="!isTelegram" class="banner">
      Приложение открыто не в Telegram: показаны тестовые данные. Чтобы увидеть
      реальные данные пользователя, открой мини-приложение из бота.
    </div>
    <main class="content">
      <h1 class="title">Telegram Mini App Demo</h1>
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--tg-bg);
  color: var(--tg-text);
}

.banner {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--tg-secondary-bg);
  color: var(--tg-hint);
  font-size: 14px;
  line-height: 1.4;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 20px;
}
</style>
