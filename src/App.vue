<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getWebApp, isTelegram, type TelegramThemeParams } from './telegram'
import {
  applyDecay,
  createInitialState,
  pet as petState,
  MOOD_MIN,
  TICK_MS,
  type TamagotchiState,
} from './tamagotchi'
import { loadState, saveState } from './storage'
import Tamagotchi from './components/Tamagotchi.vue'
import MoodControls from './components/MoodControls.vue'

const webApp = getWebApp()
const inTelegram = isTelegram()
const theme = ref<TelegramThemeParams>({})
const state = ref<TamagotchiState>(createInitialState(Date.now()))
const now = ref(Date.now())

const current = computed(() => applyDecay(state.value, now.value))
const away = computed(() => current.value.awayUntil !== null || current.value.mood <= MOOD_MIN)
const remainingMs = computed(() =>
  current.value.awayUntil === null ? null : Math.max(0, current.value.awayUntil - now.value),
)

let timer: number | undefined

function commitTransitions(): void {
  const next = applyDecay(state.value, now.value)
  if (next.awayUntil !== state.value.awayUntil || next.lastSeen !== state.value.lastSeen) {
    state.value = next
    void saveState(next)
  }
}

function tick(): void {
  now.value = Date.now()
  commitTransitions()
}

function handlePet(): void {
  now.value = Date.now()
  state.value = petState(current.value, now.value)
  void saveState(state.value)
}

function handleSetMood(mood: number): void {
  now.value = Date.now()
  state.value = { mood, lastSeen: now.value, awayUntil: null, lastFedAt: null }
  void saveState(state.value)
}

function applyTheme(): void {
  theme.value = { ...(webApp?.themeParams ?? {}) }
}

const themeStyle = computed(() => ({
  '--tg-bg': theme.value.bg_color ?? '#ffffff',
  '--tg-text': theme.value.text_color ?? '#000000',
  '--tg-hint': theme.value.hint_color ?? '#707579',
  '--tg-button': theme.value.button_color ?? '#2481cc',
  '--tg-button-text': theme.value.button_text_color ?? '#ffffff',
  '--tg-secondary-bg': theme.value.secondary_bg_color ?? '#f4f4f5',
}))

function handleVisibility(): void {
  now.value = Date.now()
  commitTransitions()
  if (document.visibilityState === 'hidden') {
    void saveState(state.value)
  }
}

onMounted(async () => {
  if (webApp) {
    webApp.ready()
    webApp.expand()
    applyTheme()
    webApp.onEvent('themeChanged', applyTheme)
  }
  const loaded = await loadState()
  if (loaded) {
    state.value = loaded
  }
  now.value = Date.now()
  commitTransitions()
  timer = window.setInterval(tick, TICK_MS)
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  webApp?.offEvent('themeChanged', applyTheme)
  if (timer !== undefined) {
    window.clearInterval(timer)
  }
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <div class="app" :style="themeStyle">
    <div v-if="!inTelegram" class="banner">
      Приложение открыто не в Telegram: настроение хранится локально в браузере.
    </div>
    <main class="content">
      <Tamagotchi :mood="current.mood" :away="away" />
      <MoodControls
        :mood="current.mood"
        :remaining-ms="remainingMs"
        @pet="handlePet"
        @set-mood="handleSetMood"
      />
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
  min-height: var(--tg-viewport-stable-height, 100dvh);
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
</style>
