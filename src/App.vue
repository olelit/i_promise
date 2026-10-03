<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect,
} from 'vue'
import { getWebApp, isTelegram, type TelegramThemeParams } from './telegram'
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
import { m, messages } from './i18n'
import { pickPhrase, type PhraseEvent } from './phrases'
import { LEAVE_MS } from './pixel/character'
import Tamagotchi from './components/Tamagotchi.vue'
import RoomScene from './components/RoomScene.vue'
import MoodIndicator from './components/MoodIndicator.vue'
import MoodControls from './components/MoodControls.vue'
import SpeechBubble from './components/SpeechBubble.vue'
import TaskCreateDialog from './components/TaskCreateDialog.vue'
import TaskInfoDialog from './components/TaskInfoDialog.vue'
import SkinDialog from './components/SkinDialog.vue'
import type { SkinId } from './tamagotchi'

const webApp = getWebApp()
const inTelegram = isTelegram()
const theme = ref<TelegramThemeParams>({})
const state = ref<TamagotchiState>(createInitialState(Date.now()))
const now = ref(Date.now())
const createOpen = ref(false)
const infoOpen = ref(false)
const ready = ref(false)
const skinOpen = ref(false)
const hasSecondaryButton =
  inTelegram &&
  webApp !== undefined &&
  webApp.isVersionAtLeast?.('7.10') === true &&
  webApp.SecondaryButton !== undefined

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

const bubbleOff = ref(false)
let bubbleOffTimer: number | undefined

watch(away, (value) => {
  if (bubbleOffTimer !== undefined) {
    window.clearTimeout(bubbleOffTimer)
    bubbleOffTimer = undefined
  }
  if (!value) {
    bubbleOff.value = false
    return
  }
  if (!ready.value) {
    bubbleOff.value = true
    return
  }
  bubbleOffTimer = window.setTimeout(() => {
    bubbleOff.value = true
    bubbleOffTimer = undefined
  }, LEAVE_MS)
})

let timer: number | undefined
let saveTimer: number | undefined

function scheduleSave(): void {
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer)
  }
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    void saveState(state.value)
  }, 300)
}
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

function handleSkinSelect(skin: SkinId): void {
  now.value = Date.now()
  state.value = { ...current.value, skin, lastSeen: now.value }
  void saveState(state.value)
  skinOpen.value = false
  webApp?.HapticFeedback.impactOccurred('light')
}

function handleSkinButton(): void {
  skinOpen.value = true
}

async function requestRules(): Promise<void> {
  if (!inTelegram || webApp === undefined || current.value.rulesSent) {
    return
  }
  try {
    const response = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: webApp.initData }),
    })
    if (!response.ok) {
      return
    }
    now.value = Date.now()
    state.value = { ...current.value, rulesSent: true, lastSeen: now.value }
    void saveState(state.value)
  } catch {
    // offline or the endpoint is unavailable — retry on the next launch
  }
}

function handleSetMood(mood: number): void {
  now.value = Date.now()
  const before = current.value
  const wasAway = before.awayUntil !== null
  const awayUntil = mood <= MOOD_MIN ? (before.awayUntil ?? now.value + AWAY_DURATION_MS) : null
  state.value = { ...before, mood, lastSeen: now.value, awayUntil }
  scheduleSave()
  if (!wasAway && awayUntil !== null) {
    say('awayStart')
  } else if (wasAway && awayUntil === null) {
    say('returned')
  }
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
  if (createOpen.value || infoOpen.value || skinOpen.value) {
    return
  }
  if (task.value === null) {
    createOpen.value = true
  } else {
    infoOpen.value = true
  }
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
  webApp.MainButton.setText(m(task.value === null ? messages.taskButton : messages.taskButtonActive))
  if (createOpen.value || infoOpen.value || skinOpen.value) {
    webApp.MainButton.hide()
  } else {
    webApp.MainButton.show()
  }
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
    if (hasSecondaryButton && webApp?.SecondaryButton) {
      webApp.SecondaryButton.setText(m(messages.skins))
      webApp.SecondaryButton.onClick(handleSkinButton)
      webApp.SecondaryButton.show()
    }
  }
  const loaded = await loadState()
  if (loaded) {
    state.value = loaded
  }
  now.value = Date.now()
  say('greeting')
  commitTransitions()
  await nextTick()
  ready.value = true
  void requestRules()
  timer = window.setInterval(tick, TICK_MS)
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  webApp?.offEvent('themeChanged', applyTheme)
  webApp?.MainButton.offClick(handleMainButton)
  webApp?.MainButton.hide()
  webApp?.SecondaryButton?.offClick(handleSkinButton)
  webApp?.SecondaryButton?.hide()
  if (timer !== undefined) {
    window.clearInterval(timer)
  }
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer)
    void saveState(state.value)
  }
  if (bubbleOffTimer !== undefined) {
    window.clearTimeout(bubbleOffTimer)
  }
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <div class="app" :style="themeStyle">
    <RoomScene :away="away" :now="now" :animate="ready" />
    <div v-if="!inTelegram" class="banner">
      {{ m(messages.banner) }}
    </div>
    <MoodIndicator :mood="current.mood" interactive @set-mood="handleSetMood" />
    <main class="content">
      <div class="pet-area">
        <div class="pet-wrap">
          <Tamagotchi :mood="current.mood" :away="away" :animate="ready" :skin="current.skin" />
        </div>
        <div class="bubble-anchor">
          <SpeechBubble v-if="!bubbleOff" :message="phrase" />
        </div>
      </div>
      <MoodControls
        :remaining-ms="remainingMs"
        :next-feed-ms="nextFeedMs"
        :block-reason="feedBlock"
        @feed="handleFeed"
        @feed-blocked="handleFeedBlocked"
      />
      <div v-if="!inTelegram || !hasSecondaryButton" class="task-actions">
        <button
          v-if="!inTelegram"
          class="task-button"
          type="button"
          @click="task === null ? (createOpen = true) : (infoOpen = true)"
        >
          {{ task === null ? m(messages.taskButton) : m(messages.taskButtonActive) }}
        </button>
        <button
          v-if="!hasSecondaryButton"
          class="task-button"
          type="button"
          @click="skinOpen = true"
        >
          {{ m(messages.skins) }}
        </button>
      </div>
    </main>
    <RoomScene :away="away" :now="now" front :animate="ready" />
    <SkinDialog v-if="skinOpen" :selected="current.skin" @select="handleSkinSelect" @close="skinOpen = false" />
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
  position: relative;
  z-index: 1;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pet-area {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-wrap {
  position: fixed;
  left: 50%;
  bottom: 20vh;
  transform: translateX(-50%);
}

.bubble-anchor {
  position: fixed;
  left: 50%;
  bottom: calc(20vh + 250px);
  width: 0;
  height: 0;
  transform: translateX(-50%);
  z-index: 3;
}

@media (min-aspect-ratio: 4/7) {
  .pet-wrap {
    bottom: calc(50vh - 52.5vw);
  }

  .bubble-anchor {
    bottom: calc(50vh - 52.5vw + 250px);
  }
}

.task-actions {
  display: flex;
  gap: 10px;
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
