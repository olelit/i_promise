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
  advanceClockOffset,
  applyDecay,
  canFeed,
  completeTask,
  createInitialState,
  DEFAULT_TIME_SPEED,
  extendTask,
  FAST_TICK_MS,
  feedBlockReason,
  feed as feedState,
  feedCooldownRemaining,
  MOOD_MIN,
  startTask,
  TASK_MILESTONE_FRACTION,
  TASK_MILESTONE_SOON_MS,
  taskTiming,
  TICK_MS,
  type TamagotchiState,
  type TimeSpeed,
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
import TasksDialog from './components/TasksDialog.vue'
import TaskProgress from './components/TaskProgress.vue'
import FeedButton from './components/FeedButton.vue'
import TimeControls from './components/TimeControls.vue'
import SkinDialog from './components/SkinDialog.vue'
import type { SkinId } from './tamagotchi'

const webApp = getWebApp()
const inTelegram = isTelegram()
const theme = ref<TelegramThemeParams>({})
const state = ref<TamagotchiState>(createInitialState(Date.now()))
const now = ref(Date.now())
const speed = ref<TimeSpeed>(DEFAULT_TIME_SPEED)
const CLOCK_SAVE_MS = 5_000
let lastReal = Date.now()
let offsetSavedAt = 0
const createOpen = ref(false)
const tasksOpen = ref(false)
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
const milestones = ref({ startedAt: 0, half: false, quarter: false, soon: false })

function syncClock(force = false): void {
  const real = Date.now()
  const offset = advanceClockOffset(state.value.clockOffset, real - lastReal, speed.value)
  lastReal = real
  if (offset !== state.value.clockOffset) {
    state.value = { ...state.value, clockOffset: offset }
  }
  now.value = real + offset
  if (force || (speed.value !== 1 && real - offsetSavedAt >= CLOCK_SAVE_MS)) {
    offsetSavedAt = real
    void saveState(state.value)
  }
}

function restartTimer(): void {
  if (timer !== undefined) {
    window.clearInterval(timer)
  }
  timer = window.setInterval(tick, speed.value === 1 || speed.value === 0 ? TICK_MS : FAST_TICK_MS)
}

function handleSpeedSelect(next: TimeSpeed): void {
  syncClock(true)
  speed.value = next
  lastReal = Date.now()
  restartTimer()
  webApp?.HapticFeedback.impactOccurred('light')
}

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

function checkMilestones(announce: boolean): void {
  const activeTask = current.value.task
  if (activeTask === null) {
    milestones.value = { startedAt: 0, half: false, quarter: false, soon: false }
    return
  }
  const timing = taskTiming(activeTask, now.value)
  const half = timing.remaining <= timing.total * TASK_MILESTONE_FRACTION[0]
  const quarter = timing.remaining <= timing.total * TASK_MILESTONE_FRACTION[1]
  const soon = timing.remaining <= TASK_MILESTONE_SOON_MS
  if (milestones.value.startedAt !== activeTask.startedAt) {
    milestones.value = { startedAt: activeTask.startedAt, half, quarter, soon }
    return
  }
  if (announce) {
    if (soon && !milestones.value.soon) {
      say('taskTenMinutes')
    } else if (quarter && !milestones.value.quarter) {
      say('taskQuarter')
    } else if (half && !milestones.value.half) {
      say('taskHalf')
    }
  }
  milestones.value = { startedAt: activeTask.startedAt, half, quarter, soon }
}

function tick(): void {
  syncClock()
  commitTransitions()
  checkMilestones(true)
}

function handleFeed(): void {
  syncClock()
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
  syncClock()
  state.value = { ...current.value, skin, lastSeen: now.value }
  void saveState(state.value)
  skinOpen.value = false
  webApp?.HapticFeedback.impactOccurred('light')
}

function handleSkinButton(): void {
  skinOpen.value = true
}

async function requestRules(): Promise<void> {
  if (!inTelegram || webApp === undefined || webApp.initData === '' || current.value.rulesSent) {
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
    syncClock()
    state.value = { ...current.value, rulesSent: true, lastSeen: now.value }
    void saveState(state.value)
  } catch {
    // offline or the endpoint is unavailable — retry on the next launch
  }
}

function handleTaskStart(input: { hours: number; description: string }): void {
  syncClock()
  const hadTask = current.value.task !== null
  state.value = startTask(current.value, input, now.value)
  void saveState(state.value)
  createOpen.value = false
  if (!hadTask) {
    say('taskStart')
    checkMilestones(false)
  }
}

function handleTaskComplete(): void {
  syncClock()
  if (current.value.task === null) {
    state.value = current.value
    void saveState(state.value)
    say('overdue')
    checkMilestones(false)
    return
  }
  state.value = completeTask(current.value, now.value)
  void saveState(state.value)
  say('taskComplete')
  checkMilestones(false)
}

function handleTaskExtend(): void {
  syncClock()
  if (current.value.task === null) {
    state.value = current.value
    void saveState(state.value)
    say('overdue')
    checkMilestones(false)
    return
  }
  state.value = extendTask(current.value, now.value)
  void saveState(state.value)
  say('taskExtend')
  checkMilestones(false)
}

function handleTaskAbandon(): void {
  syncClock()
  if (current.value.task === null) {
    state.value = current.value
    void saveState(state.value)
    say('overdue')
    checkMilestones(false)
    return
  }
  state.value = abandonTask(current.value, now.value)
  void saveState(state.value)
  say('taskAbandon')
  checkMilestones(false)
}

function handleNewTask(): void {
  tasksOpen.value = false
  createOpen.value = true
}

function handleMainButton(): void {
  if (createOpen.value || skinOpen.value || tasksOpen.value) {
    return
  }
  tasksOpen.value = true
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
  webApp.MainButton.setText(m(messages.tasks))
  if (createOpen.value || skinOpen.value || tasksOpen.value) {
    webApp.MainButton.hide()
  } else {
    webApp.MainButton.show()
  }
})

function handleVisibility(): void {
  syncClock(true)
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
  checkMilestones(true)
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
  syncClock()
  say('greeting')
  commitTransitions()
  checkMilestones(false)
  await nextTick()
  ready.value = true
  void requestRules()
  restartTimer()
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
  syncClock(true)
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
    <MoodIndicator :mood="current.mood" />
    <button
      v-if="task !== null"
      class="task-progress-button"
      type="button"
      @click="tasksOpen = true"
    >
      <TaskProgress :task="task" :now="now" />
    </button>
    <main class="content">
      <div class="pet-area">
        <div class="pet-wrap">
          <Tamagotchi :mood="current.mood" :away="away" :animate="ready" :skin="current.skin" />
        </div>
        <div class="bubble-anchor">
          <SpeechBubble v-if="!bubbleOff" :message="phrase" />
        </div>
      </div>
      <MoodControls :remaining-ms="remainingMs" />
      <div class="task-actions">
        <button
          v-if="!inTelegram"
          class="task-button"
          type="button"
          @click="tasksOpen = true"
        >
          {{ m(messages.tasks) }}
        </button>
        <button
          v-if="!hasSecondaryButton"
          class="task-button"
          type="button"
          @click="skinOpen = true"
        >
          {{ m(messages.skins) }}
        </button>
        <FeedButton
          v-if="!away"
          :next-feed-ms="nextFeedMs"
          :block-reason="feedBlock"
          @feed="handleFeed"
          @feed-blocked="handleFeedBlocked"
        />
        <TimeControls :speed="speed" @select="handleSpeedSelect" />
      </div>
    </main>
    <RoomScene :away="away" :now="now" front :animate="ready" />
    <SkinDialog v-if="skinOpen" :selected="current.skin" @select="handleSkinSelect" @close="skinOpen = false" />
    <TaskCreateDialog v-if="createOpen" @start="handleTaskStart" @close="createOpen = false" />
    <TasksDialog
      v-if="tasksOpen"
      :task="task"
      :now="now"
      :history="current.history"
      @complete="handleTaskComplete"
      @extend="handleTaskExtend"
      @abandon="handleTaskAbandon"
      @new-task="handleNewTask"
      @close="tasksOpen = false"
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
  flex-wrap: wrap;
  justify-content: center;
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

.task-progress-button {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
</style>
