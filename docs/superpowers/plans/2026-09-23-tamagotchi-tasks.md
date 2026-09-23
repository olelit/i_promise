# Tamagotchi Stage 2: Tasks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tasks with hours + description, an immediate mood boost by complexity, a contextual MainButton, an info dialog with complete/extend/abandon, and overdue handling — persisted between sessions.

**Architecture:** Task logic joins the pure functions in `src/tamagotchi.ts` (overdue check runs before the away branch, decay rate doubles per extension); `task` is added to the persisted state with backward-compatible validation; three presentational components (`Modal.vue` + two dialogs) render the flows; `App.vue` wires the contextual MainButton and actions.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, vue-tsc 3.3.

## Global Constraints

- Commit messages MUST be written in English only.
- All Telegram API access goes through `src/telegram.ts`; never add a Telegram npm SDK.
- All persistence goes through `src/storage.ts`.
- No backend, no network requests.
- Vue SFCs use `<script setup lang="ts">`; TypeScript strict mode.
- UI chrome colors come only from the theme CSS custom properties defined in `App.vue`; the character palette is fixed.
- Mood boost at task start: `min(100, max(mood, 20 + 10 * hours))`; hours `1..12`; description up to `120` chars.
- Decay while a task is active: `20 * 2 ** extensions` per hour; normal rate after the task ends.
- Overdue (deadline passed) → mood `0`, task cleared; abandon → mood `0`; complete → mood unchanged.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Task logic and storage

**Files:**
- Modify: `src/tamagotchi.ts` (full rewrite)
- Modify: `src/storage.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TamagotchiTask` (`{ description, hours, startedAt, deadline, extensions }`); state field `task: TamagotchiTask | null`; constants `TASK_MIN_HOURS`, `TASK_MAX_HOURS`, `TASK_MOOD_BASE`, `TASK_MOOD_PER_HOUR`, `TASK_DESCRIPTION_MAX`, `EXTENSION_MS`; functions `startTask(state, input, now)`, `completeTask(state, now)`, `extendTask(state, now)`, `abandonTask(state, now)`; `applyDecay` now clears overdue tasks and accelerates decay per extension.

- [ ] **Step 1: Replace `src/tamagotchi.ts`**

```ts
export interface TamagotchiTask {
  description: string
  hours: number
  startedAt: number
  deadline: number
  extensions: number
}

export interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
  task: TamagotchiTask | null
}

export const MOOD_MAX = 100
export const MOOD_MIN = -100
export const INITIAL_MOOD = 100
export const DECAY_PER_HOUR = 20
export const AWAY_DURATION_MS = 2 * 3_600_000
export const RETURN_MOOD = -50
export const TICK_MS = 60_000
export const FEED_GAIN = 20
export const FEED_CAP = 20
export const FEED_COOLDOWN_MS = 24 * 3_600_000
export const TASK_MIN_HOURS = 1
export const TASK_MAX_HOURS = 12
export const TASK_MOOD_BASE = 20
export const TASK_MOOD_PER_HOUR = 10
export const TASK_DESCRIPTION_MAX = 120
export const EXTENSION_MS = 3_600_000

const HOUR_MS = 3_600_000

export function createInitialState(now: number): TamagotchiState {
  return { mood: INITIAL_MOOD, lastSeen: now, awayUntil: null, lastFedAt: null, task: null }
}

function decayRate(state: TamagotchiState): number {
  if (state.task === null) {
    return DECAY_PER_HOUR
  }
  return DECAY_PER_HOUR * 2 ** state.task.extensions
}

export function applyDecay(state: TamagotchiState, now: number): TamagotchiState {
  if (state.task !== null && now >= state.task.deadline) {
    return { mood: 0, lastSeen: now, awayUntil: null, lastFedAt: state.lastFedAt, task: null }
  }

  if (state.awayUntil !== null) {
    if (now >= state.awayUntil) {
      return {
        mood: RETURN_MOOD,
        lastSeen: now,
        awayUntil: null,
        lastFedAt: state.lastFedAt,
        task: state.task,
      }
    }
    return state
  }

  const hours = (now - state.lastSeen) / HOUR_MS
  const mood = Math.min(MOOD_MAX, Math.max(MOOD_MIN, state.mood - hours * decayRate(state)))

  if (mood <= MOOD_MIN) {
    return {
      mood: MOOD_MIN,
      lastSeen: now,
      awayUntil: now + AWAY_DURATION_MS,
      lastFedAt: state.lastFedAt,
      task: state.task,
    }
  }

  return { mood, lastSeen: state.lastSeen, awayUntil: null, lastFedAt: state.lastFedAt, task: state.task }
}

export function feedCooldownRemaining(state: TamagotchiState, now: number): number | null {
  if (state.awayUntil !== null || state.lastFedAt === null) {
    return null
  }
  const remaining = state.lastFedAt + FEED_COOLDOWN_MS - now
  return remaining > 0 ? remaining : null
}

export function canFeed(state: TamagotchiState, now: number): boolean {
  return feedCooldownRemaining(state, now) === null
}

export function feed(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: Math.min(FEED_CAP, state.mood + FEED_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: now,
    task: state.task,
  }
}

export function startTask(
  state: TamagotchiState,
  input: { hours: number; description: string },
  now: number,
): TamagotchiState {
  const hours = Math.min(TASK_MAX_HOURS, Math.max(TASK_MIN_HOURS, Math.round(input.hours)))
  const mood = Math.min(MOOD_MAX, Math.max(state.mood, TASK_MOOD_BASE + TASK_MOOD_PER_HOUR * hours))
  return {
    mood,
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: state.lastFedAt,
    task: {
      description: input.description.trim(),
      hours,
      startedAt: now,
      deadline: now + hours * HOUR_MS,
      extensions: 0,
    },
  }
}

export function completeTask(state: TamagotchiState, now: number): TamagotchiState {
  return { ...state, lastSeen: now, task: null }
}

export function extendTask(state: TamagotchiState, now: number): TamagotchiState {
  if (state.task === null) {
    return state
  }
  return {
    ...state,
    lastSeen: now,
    task: {
      ...state.task,
      deadline: state.task.deadline + EXTENSION_MS,
      extensions: state.task.extensions + 1,
    },
  }
}

export function abandonTask(state: TamagotchiState, now: number): TamagotchiState {
  return { ...state, mood: 0, lastSeen: now, task: null }
}

export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  if (minutes < 1) {
    return 'меньше минуты'
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest} мин`
  }
  return `${hours} ч ${rest} мин`
}
```

- [ ] **Step 2: Update `src/storage.ts`**

Import `TamagotchiTask` as a type and replace the guard/normalizer:

```ts
import { getWebApp, type TelegramCloudStorage } from './telegram'
import type { TamagotchiState, TamagotchiTask } from './tamagotchi'

const KEY = 'tamagotchi-state'

function isValidTask(value: unknown): value is TamagotchiTask {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.description === 'string' &&
    typeof candidate.hours === 'number' &&
    Number.isFinite(candidate.hours) &&
    typeof candidate.startedAt === 'number' &&
    Number.isFinite(candidate.startedAt) &&
    typeof candidate.deadline === 'number' &&
    Number.isFinite(candidate.deadline) &&
    typeof candidate.extensions === 'number' &&
    Number.isFinite(candidate.extensions)
  )
}

function isValidState(value: unknown): value is TamagotchiState {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  const moodOk = typeof candidate.mood === 'number' && Number.isFinite(candidate.mood)
  const lastSeenOk = typeof candidate.lastSeen === 'number' && Number.isFinite(candidate.lastSeen)
  const awayOk =
    candidate.awayUntil === null ||
    (typeof candidate.awayUntil === 'number' && Number.isFinite(candidate.awayUntil))
  const lastFedOk =
    candidate.lastFedAt === undefined ||
    candidate.lastFedAt === null ||
    (typeof candidate.lastFedAt === 'number' && Number.isFinite(candidate.lastFedAt))
  const taskOk =
    candidate.task === undefined || candidate.task === null || isValidTask(candidate.task)
  return moodOk && lastSeenOk && awayOk && lastFedOk && taskOk
}

function normalizeState(state: TamagotchiState): TamagotchiState {
  return { ...state, lastFedAt: state.lastFedAt ?? null, task: state.task ?? null }
}
```

(keep the rest of the file unchanged; `parseState` already calls `normalizeState`.)

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/tamagotchi.ts src/storage.ts
git commit -m "Add task logic with overdue and decay acceleration"
```

---

### Task 2: Modal and task dialogs

**Files:**
- Create: `src/components/Modal.vue`
- Create: `src/components/TaskCreateDialog.vue`
- Create: `src/components/TaskInfoDialog.vue`

**Interfaces:**
- Consumes: `TASK_MIN_HOURS`, `TASK_MAX_HOURS`, `TASK_DESCRIPTION_MAX`, `EXTENSION_MS` (unused here), `formatRemaining`, type `TamagotchiTask`.
- Produces: `Modal` (prop `title`, slot, emit `close`); `TaskCreateDialog` (emit `start: [input: { hours: number; description: string }]`, `close`); `TaskInfoDialog` (props `{ task: TamagotchiTask; now: number }`, emits `complete`, `extend`, `abandon`, `close`).

- [ ] **Step 1: Create `src/components/Modal.vue`**

```vue
<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <section class="panel" role="dialog" aria-modal="true">
      <h2 class="title">{{ title }}</h2>
      <slot />
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.panel {
  width: 100%;
  max-width: 340px;
  padding: 16px;
  border-radius: 16px;
  background: var(--tg-bg);
  color: var(--tg-text);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 17px;
}
</style>
```

- [ ] **Step 2: Create `src/components/TaskCreateDialog.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { TASK_DESCRIPTION_MAX, TASK_MAX_HOURS, TASK_MIN_HOURS } from '../tamagotchi'
import Modal from './Modal.vue'

const emit = defineEmits<{ start: [input: { hours: number; description: string }]; close: [] }>()

const hours = ref(TASK_MIN_HOURS)
const description = ref('')

const valid = computed(() => {
  const text = description.value.trim()
  return (
    text.length > 0 &&
    text.length <= TASK_DESCRIPTION_MAX &&
    Number.isInteger(hours.value) &&
    hours.value >= TASK_MIN_HOURS &&
    hours.value <= TASK_MAX_HOURS
  )
})

function submit(): void {
  if (!valid.value) {
    return
  }
  emit('start', { hours: hours.value, description: description.value.trim() })
}
</script>

<template>
  <Modal title="Начать задачу" @close="emit('close')">
    <label class="field">
      <span>Сколько часов</span>
      <input v-model.number="hours" type="number" :min="TASK_MIN_HOURS" :max="TASK_MAX_HOURS" step="1" />
    </label>
    <label class="field">
      <span>Краткое описание</span>
      <input
        v-model="description"
        type="text"
        :maxlength="TASK_DESCRIPTION_MAX"
        placeholder="Что нужно сделать?"
      />
    </label>
    <div class="actions">
      <button class="secondary" type="button" @click="emit('close')">Отмена</button>
      <button class="primary" type="button" :disabled="!valid" @click="submit">Начать</button>
    </div>
  </Modal>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--tg-hint);
}

.field input {
  padding: 10px 12px;
  border: 1px solid var(--tg-secondary-bg);
  border-radius: 10px;
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.primary,
.secondary {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}

.primary {
  background: var(--tg-button);
  color: var(--tg-button-text);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.secondary {
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
}
</style>
```

- [ ] **Step 3: Create `src/components/TaskInfoDialog.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatRemaining, type TamagotchiTask } from '../tamagotchi'
import Modal from './Modal.vue'

const props = defineProps<{ task: TamagotchiTask; now: number }>()
const emit = defineEmits<{ complete: []; extend: []; abandon: []; close: [] }>()

const confirming = ref(false)
const remaining = computed(() => Math.max(0, props.task.deadline - props.now))

function handleAbandon(): void {
  if (!confirming.value) {
    confirming.value = true
    return
  }
  emit('abandon')
}
</script>

<template>
  <Modal title="Задача" @close="emit('close')">
    <p class="description">{{ task.description }}</p>
    <p class="row">Часов: {{ task.hours }}</p>
    <p class="row">Осталось: {{ formatRemaining(remaining) }}</p>
    <p v-if="task.extensions > 0" class="row">Продлений: {{ task.extensions }}</p>
    <div class="actions">
      <button class="primary" type="button" @click="emit('complete')">Выполнено</button>
      <button class="secondary" type="button" @click="emit('extend')">+1 час</button>
      <button class="danger" type="button" @click="handleAbandon">
        {{ confirming ? 'Точно отказаться?' : 'Отказаться' }}
      </button>
      <button class="secondary" type="button" @click="emit('close')">Закрыть</button>
    </div>
  </Modal>
</template>

<style scoped>
.description {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.row {
  margin: 0;
  color: var(--tg-hint);
  font-size: 14px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary,
.secondary,
.danger {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}

.primary {
  background: var(--tg-button);
  color: var(--tg-button-text);
}

.secondary {
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
}

.danger {
  background: #d9534f;
  color: #ffffff;
}
</style>
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.vue src/components/TaskCreateDialog.vue src/components/TaskInfoDialog.vue
git commit -m "Add task create and info dialogs"
```

---

### Task 3: Contextual MainButton and task wiring

**Files:**
- Modify: `src/App.vue` (full rewrite)

**Interfaces:**
- Consumes: everything from Tasks 1-2, plus stage-1 components.
- Produces: the stage-2 app.

- [ ] **Step 1: Replace `src/App.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { getWebApp, isTelegram, type TelegramThemeParams } from './telegram'
import {
  abandonTask,
  applyDecay,
  canFeed,
  completeTask,
  createInitialState,
  extendTask,
  feed as feedState,
  feedCooldownRemaining,
  MOOD_MIN,
  startTask,
  TICK_MS,
  type TamagotchiState,
} from './tamagotchi'
import { loadState, saveState } from './storage'
import Tamagotchi from './components/Tamagotchi.vue'
import MoodIndicator from './components/MoodIndicator.vue'
import MoodControls from './components/MoodControls.vue'
import TaskCreateDialog from './components/TaskCreateDialog.vue'
import TaskInfoDialog from './components/TaskInfoDialog.vue'

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
const task = computed(() => current.value.task)
const showTaskButton = computed(() => !(away.value && task.value === null))

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

function handleFeed(): void {
  now.value = Date.now()
  if (!canFeed(current.value, now.value)) {
    return
  }
  state.value = feedState(current.value, now.value)
  void saveState(state.value)
}

function handleTaskStart(input: { hours: number; description: string }): void {
  now.value = Date.now()
  state.value = startTask(current.value, input, now.value)
  void saveState(state.value)
  createOpen.value = false
}

function handleTaskComplete(): void {
  now.value = Date.now()
  state.value = completeTask(current.value, now.value)
  void saveState(state.value)
  infoOpen.value = false
}

function handleTaskExtend(): void {
  now.value = Date.now()
  state.value = extendTask(current.value, now.value)
  void saveState(state.value)
}

function handleTaskAbandon(): void {
  now.value = Date.now()
  state.value = abandonTask(current.value, now.value)
  void saveState(state.value)
  infoOpen.value = false
}

function handleMainButton(): void {
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
}))

watchEffect(() => {
  if (!webApp) {
    return
  }
  if (!showTaskButton.value) {
    webApp.MainButton.hide()
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
    webApp.MainButton.onClick(handleMainButton)
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
      <div class="pet-row">
        <Tamagotchi :mood="current.mood" :away="away" />
        <MoodIndicator :mood="current.mood" />
      </div>
      <MoodControls :remaining-ms="remainingMs" :next-feed-ms="nextFeedMs" @feed="handleFeed" />
      <button
        v-if="!inTelegram && showTaskButton"
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
}

.pet-row {
  display: flex;
  align-items: center;
  gap: 16px;
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
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 3: Browser checks (headless, state injected before app scripts)**

- Start a task via the in-page button: fill hours `4` and a description, press «Начать» → mood becomes `max(old, 60)` (with mood 0 injected it becomes 60), MainButton-equivalent button text becomes «Задача»;
- info dialog shows the description, hours, countdown and «Продлений: 0»; «+1 час» increases the countdown by 1h and shows «Продлений: 1»;
- injected state with `extensions: 1` and `lastSeen` 2h in the past decays twice as fast as `extensions: 0` (compare computed mood);
- injected state with `deadline` in the past → on load mood `0` and the task is cleared;
- «Выполнено» keeps mood, «Отказаться» (two clicks) sets mood 0 and closes the dialog;
- reload keeps an active task.
Kill the dev server afterwards.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "Wire tasks with contextual MainButton"
```

---

### Task 4: Documentation

**Files:**
- Modify: `README.MD`

**Interfaces:**
- Consumes: the stage-2 app.
- Produces: docs.

- [ ] **Step 1: Add the task mechanics to the «Механика» section**

Add after the table:

```markdown
### Задачи

- «Начать задачу»: указываешь часы (1–12) и краткое описание; настроение сразу
  поднимается до `max(текущее, 20 + 10×часов)`, но не выше 100
- Пока задача активна, настроение падает быстрее: каждое «+1 час» удваивает
  скорость падения
- «Выполнено» до дедлайна — настроение остаётся; «Отказаться» — настроение
  падает до 0
- Просроченная задача — настроение падает до 0
```

- [ ] **Step 2: Verify build and commit**

Run: `npm run build` → exits 0.

```bash
git add README.MD
git commit -m "Document task mechanics"
```
