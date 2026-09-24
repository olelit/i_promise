<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect,
} from 'vue'
import { getWebApp, isTelegram, type TelegramThemeParams } from './telegram'
import { isWebglAvailable } from './webgl'
import {
  abandonTask,
  applyDecay,
  AWAY_DURATION_MS,
  canFeed,
  completeTask,
  createInitialState,
  extendTask,
  feedBlockReason,
  feed as feedState,
  feedCooldownRemaining,
  MOOD_MIN,
  startTask,
  TICK_MS,
  type TamagotchiState,
} from './tamagotchi'
import { loadState, saveState } from './storage'
import { pickPhrase, type PhraseEvent } from './phrases'
import Tamagotchi from './components/Tamagotchi.vue'
import MoodIndicator from './components/MoodIndicator.vue'
import MoodControls from './components/MoodControls.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import TaskCreateDialog from './components/TaskCreateDialog.vue'
import TaskInfoDialog from './components/TaskInfoDialog.vue'

const use3d = ref(isWebglAvailable())

const Tamagotchi3D = defineAsyncComponent({
  loader: () => import('./components/Tamagotchi3D.vue'),
  loadingComponent: Tamagotchi,
  onError(_error, _retry, fail) {
    use3d.value = false
    fail()
  },
})

const webApp = getWebApp()
const inTelegram = isTelegram()
const theme = ref<TelegramThemeParams>({})
const state = ref<TamagotchiState>(createInitialState(Date.now()))
const now = ref(Date.now())
const createOpen = ref(false)
const infoOpen = ref(false)

const current = computed(() => applyDecay(state.value, now.value))
const away = computed(() => current.value.awayUntil !== null || current.value.mood <= MOOD_MIN)
const remainingMs = computed(() =>
  current.value.awayUntil === null ? null : Math.max(0, current.value.awayUntil - now.value),
)
const nextFeedMs = computed(() => feedCooldownRemaining(current.value, now.value))
const feedBlock = computed(() => {
  const reason = feedBlockReason(current.value, now.value)
  return reason === 'away' ? null : reason
})
const task = computed(() => current.value.task)

const phrase = ref<{ text: string; id: number } | null>(null)
let phraseId = 0

function say(event: PhraseEvent): void {
  phraseId += 1
  phrase.value = { text: pickPhrase(event), id: phraseId }
}

let timer: number | undefined
let hiddenAt: number | null = null

function commitTransitions(): void {
  const before = state.value
  const next = applyDecay(before, now.value)
  if (next.awayUntil !== before.awayUntil || next.lastSeen !== before.lastSeen) {
    state.value = next
    void saveState(next)
    if (before.task !== null && next.task === null) {
      say('overdue')
    } else if (before.awayUntil !== null && next.awayUntil === null) {
      say('returned')
    } else if (before.awayUntil === null && next.awayUntil !== null) {
      say('awayStart')
    }
  }
}

function tick(): void {
  now.value = Date.now()
  commitTransitions()
}

function handleFeed(): void {
  now.value = Date.now()
  if (!canFeed(current.value, now.value)) {
    return
  }
  state.value = feedState(current.value, now.value)
  void saveState(state.value)
  say('feed')
}

function handleFeedBlocked(reason: 'cooldown' | 'full'): void {
  say(reason === 'full' ? 'feedAtCap' : 'feedCooldown')
}

function handleTaskStart(input: { hours: number; description: string }): void {
  now.value = Date.now()
  state.value = startTask(current.value, input, now.value)
  void saveState(state.value)
  createOpen.value = false
  say('taskStart')
}

function handleTaskComplete(): void {
  now.value = Date.now()
  if (current.value.task === null) {
    state.value = current.value
    void saveState(state.value)
    infoOpen.value = false
    say('overdue')
    return
  }
  state.value = completeTask(current.value, now.value)
  void saveState(state.value)
  infoOpen.value = false
  say('taskComplete')
}

function handleTaskExtend(): void {
  now.value = Date.now()
  if (current.value.task === null) {
    state.value = current.value
    void saveState(state.value)
    infoOpen.value = false
    say('overdue')
    return
  }
  state.value = extendTask(current.value, now.value)
  void saveState(state.value)
  say('taskExtend')
}

function handleTaskAbandon(): void {
  now.value = Date.now()
  if (current.value.task === null) {
    state.value = current.value
    void saveState(state.value)
    infoOpen.value = false
    say('overdue')
    return
  }
  state.value = abandonTask(current.value, now.value)
  void saveState(state.value)
  infoOpen.value = false
  say('taskAbandon')
}

function handleMainButton(): void {
  if (task.value === null) {
    createOpen.value = true
  } else {
    infoOpen.value = true
  }
}

const TEST_MOODS = [100, 50, 0, -50] as const
const testStep = ref(0)

function handleTestAnimation(): void {
  now.value = Date.now()
  const step = testStep.value % (TEST_MOODS.length + 1)
  testStep.value = step + 1
  if (step === TEST_MOODS.length) {
    state.value = {
      ...state.value,
      mood: MOOD_MIN,
      lastSeen: now.value,
      awayUntil: now.value + AWAY_DURATION_MS,
    }
  } else {
    state.value = {
      ...state.value,
      mood: TEST_MOODS[step],
      lastSeen: now.value,
      awayUntil: null,
    }
  }
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
  '--tg-danger': '#d9534f',
}))

watchEffect(() => {
  if (!webApp) {
    return
  }
  webApp.MainButton.setText(task.value === null ? 'Начать задачу' : 'Задача')
  webApp.MainButton.show()
})

watch(task, (value) => {
  if (value === null) {
    infoOpen.value = false
  }
})

function handleVisibility(): void {
  now.value = Date.now()
  if (document.visibilityState === 'hidden') {
    commitTransitions()
    hiddenAt = Date.now()
    void saveState(state.value)
    return
  }
  if (hiddenAt !== null && Date.now() - hiddenAt > 60_000) {
    say('greeting')
  }
  hiddenAt = null
  commitTransitions()
}

onMounted(async () => {
  if (webApp) {
    webApp.ready()
    webApp.expand()
    applyTheme()
    webApp.onEvent('themeChanged', applyTheme)
    webApp.MainButton.onClick(handleMainButton)
  }
  const loaded = await loadState()
  if (loaded) {
    state.value = loaded
  }
  now.value = Date.now()
  say('greeting')
  commitTransitions()
  timer = window.setInterval(tick, TICK_MS)
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  webApp?.offEvent('themeChanged', applyTheme)
  webApp?.MainButton.offClick(handleMainButton)
  webApp?.MainButton.hide()
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
      <MoodIndicator :mood="current.mood" />
      <div class="pet-wrap">
        <SpeechBubble :message="phrase" />
        <Tamagotchi3D
          v-if="use3d"
          :mood="current.mood"
          :away="away"
          @unsupported="use3d = false"
        />
        <Tamagotchi v-else :mood="current.mood" :away="away" />
      </div>
      <MoodControls
        :remaining-ms="remainingMs"
        :next-feed-ms="nextFeedMs"
        :block-reason="feedBlock"
        @feed="handleFeed"
        @feed-blocked="handleFeedBlocked"
      />
      <button
        v-if="!inTelegram"
        class="test-button"
        type="button"
        title="Переключает состояния: 100 → 50 → 0 → −50 → уход"
        @click="handleTestAnimation"
      >
        Тест анимаций
      </button>
      <button
        v-if="!inTelegram"
        class="task-button"
        type="button"
        @click="task === null ? (createOpen = true) : (infoOpen = true)"
      >
        {{ task === null ? 'Начать задачу' : 'Задача' }}
      </button>
    </main>
    <TaskCreateDialog v-if="createOpen" @start="handleTaskStart" @close="createOpen = false" />
    <TaskInfoDialog
      v-if="infoOpen && task !== null"
      :task="task"
      :now="now"
      @complete="handleTaskComplete"
      @extend="handleTaskExtend"
      @abandon="handleTaskAbandon"
      @close="infoOpen = false"
    />
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
  flex: 1;
  justify-content: center;
}

.pet-wrap {
  position: relative;
}

.test-button {
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: var(--tg-secondary-bg);
  color: var(--tg-hint);
  font-size: 13px;
  cursor: pointer;
}

.task-button {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}
</style>
