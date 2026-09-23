# Tamagotchi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo UI with a tamagotchi whose single mood parameter persists per user via Telegram CloudStorage (localStorage fallback), with an SVG character that gets sadder, turns away at mood 0, and leaves at -100.

**Architecture:** Pure mood logic in `src/tamagotchi.ts` (lazy recomputation from `lastSeen`, no per-frame timers); persistence routed in `src/storage.ts` (CloudStorage inside Telegram, localStorage otherwise, with error fallback); `src/App.vue` orchestrates state, a 1-minute tick for display and the away countdown; two presentational components (`Tamagotchi.vue` SVG character, `MoodControls.vue` buttons/slider).

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, vue-tsc 3.3, official Telegram WebApp script (no npm SDK), Telegram CloudStorage API.

## Global Constraints

- Commit messages MUST be written in English only.
- All Telegram API access goes through `src/telegram.ts`; never add a Telegram npm SDK.
- All persistence goes through `src/storage.ts`; components never touch CloudStorage/localStorage directly.
- No backend, no network requests; outside Telegram the app runs in browser mode.
- Vue SFCs use `<script setup lang="ts">`; TypeScript strict mode is on.
- UI chrome colors come only from the theme CSS custom properties (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`, `--tg-secondary-bg`) defined in `App.vue`. The character palette is intentionally fixed: body `#7ec8a9`, belly `#a8dcc0`, features `#2f4f43`, blush `#f4a3a3`, back curl `#5da88b`.
- Mood constants are exactly: max `100`, min `-100`, initial `100`, decay `20`/hour, pet gain `20`, away duration `2h`, return mood `-50`, tick `60_000` ms.
- This project intentionally has NO test suite: verification per task is `npm run typecheck` and `npm run build` (plus the manual browser checks listed).

---

### Task 1: Mood logic (`src/tamagotchi.ts`)

**Files:**
- Create: `src/tamagotchi.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TamagotchiState` (`{ mood: number; lastSeen: number; awayUntil: number | null }`), constants `MOOD_MAX`, `MOOD_MIN`, `INITIAL_MOOD`, `DECAY_PER_HOUR`, `PET_GAIN`, `AWAY_DURATION_MS`, `RETURN_MOOD`, `TICK_MS`, and pure functions `createInitialState(now)`, `applyDecay(state, now)`, `pet(state, now)`, `formatRemaining(ms): string`.

- [ ] **Step 1: Create `src/tamagotchi.ts`**

```ts
export interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
}

export const MOOD_MAX = 100
export const MOOD_MIN = -100
export const INITIAL_MOOD = 100
export const DECAY_PER_HOUR = 20
export const PET_GAIN = 20
export const AWAY_DURATION_MS = 2 * 3_600_000
export const RETURN_MOOD = -50
export const TICK_MS = 60_000

const HOUR_MS = 3_600_000

export function createInitialState(now: number): TamagotchiState {
  return { mood: INITIAL_MOOD, lastSeen: now, awayUntil: null }
}

export function applyDecay(state: TamagotchiState, now: number): TamagotchiState {
  if (state.awayUntil !== null) {
    if (now >= state.awayUntil) {
      return { mood: RETURN_MOOD, lastSeen: now, awayUntil: null }
    }
    return state
  }

  const hours = (now - state.lastSeen) / HOUR_MS
  const mood = Math.min(MOOD_MAX, Math.max(MOOD_MIN, state.mood - hours * DECAY_PER_HOUR))

  if (mood <= MOOD_MIN) {
    return { mood: MOOD_MIN, lastSeen: now, awayUntil: now + AWAY_DURATION_MS }
  }

  return { mood, lastSeen: state.lastSeen, awayUntil: null }
}

export function pet(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: Math.min(MOOD_MAX, state.mood + PET_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
  }
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

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/tamagotchi.ts
git commit -m "Add tamagotchi mood logic"
```

---

### Task 2: CloudStorage types and persistence (`src/telegram.ts`, `src/storage.ts`)

**Files:**
- Modify: `src/telegram.ts` (add `TelegramCloudStorage` interface and optional `CloudStorage` field)
- Create: `src/storage.ts`

**Interfaces:**
- Consumes: `getWebApp()` from `src/telegram.ts`; `TamagotchiState` from `src/tamagotchi.ts`.
- Produces: `loadState(): Promise<TamagotchiState | null>` and `saveState(state: TamagotchiState): Promise<void>`; type `TelegramCloudStorage`.

- [ ] **Step 1: Add CloudStorage types to `src/telegram.ts`**

Add this interface after `TelegramHapticFeedback`:

```ts
export interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (error: string | null, success?: boolean) => void): void
  getItem(key: string, callback: (error: string | null, value?: string) => void): void
  removeItem(key: string, callback?: (error: string | null, success?: boolean) => void): void
}
```

Add this field to the `TelegramWebApp` interface, after `HapticFeedback`:

```ts
  CloudStorage?: TelegramCloudStorage
```

- [ ] **Step 2: Create `src/storage.ts`**

```ts
import { getWebApp, type TelegramCloudStorage } from './telegram'
import type { TamagotchiState } from './tamagotchi'

const KEY = 'tamagotchi-state'

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
  return moodOk && lastSeenOk && awayOk
}

function parseState(raw: string | null | undefined): TamagotchiState | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidState(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readLocal(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeLocal(value: string): void {
  try {
    window.localStorage.setItem(KEY, value)
  } catch {
    // storage unavailable (private mode) — state stays in memory
  }
}

interface CloudReadResult {
  ok: boolean
  value: string | null
}

function readCloud(storage: TelegramCloudStorage): Promise<CloudReadResult> {
  return new Promise((resolve) => {
    try {
      storage.getItem(KEY, (error, value) => {
        if (error) {
          resolve({ ok: false, value: null })
          return
        }
        resolve({ ok: true, value: value ?? null })
      })
    } catch {
      resolve({ ok: false, value: null })
    }
  })
}

export async function loadState(): Promise<TamagotchiState | null> {
  const cloud = getWebApp()?.CloudStorage
  if (cloud) {
    const result = await readCloud(cloud)
    if (result.ok) {
      return parseState(result.value)
    }
  }
  return parseState(readLocal())
}

export function saveState(state: TamagotchiState): Promise<void> {
  const value = JSON.stringify(state)
  const cloud = getWebApp()?.CloudStorage
  if (!cloud) {
    writeLocal(value)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    try {
      cloud.setItem(KEY, value, (error) => {
        if (error) {
          writeLocal(value)
        }
        resolve()
      })
    } catch {
      writeLocal(value)
      resolve()
    }
  })
}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/telegram.ts src/storage.ts
git commit -m "Add CloudStorage types and persistence layer"
```

---

### Task 3: SVG character (`src/components/Tamagotchi.vue`)

**Files:**
- Create: `src/components/Tamagotchi.vue`

**Interfaces:**
- Consumes: `MOOD_MAX` from `src/tamagotchi.ts`.
- Produces: `Tamagotchi` component with props `mood: number`, `away: boolean`.

- [ ] **Step 1: Create `src/components/Tamagotchi.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX } from '../tamagotchi'

const props = defineProps<{ mood: number; away: boolean }>()

const t = computed(() => Math.min(1, Math.max(0, props.mood / MOOD_MAX)))
const turned = computed(() => props.mood <= 0)
const crouch = computed(() => (props.mood < 0 ? Math.min(1, -props.mood / MOOD_MAX) : 0))

const eyeRy = computed(() => 7 - (1 - t.value) * 2.5)
const pupilDy = computed(() => (1 - t.value) * 3)
const browTilt = computed(() => (1 - t.value) * 20)
const mouthPath = computed(() => {
  const curve = 20 * t.value - 12
  return `M 78 122 Q 100 ${122 + curve} 122 122`
})
const blushOpacity = computed(() => t.value)

const exitStyle = computed(() => ({
  transform: `translateX(${props.away ? '-140%' : '0'})`,
}))

const crouchStyle = computed(() => ({
  transform: `translateY(${crouch.value * 12}px) scaleY(${1 - crouch.value * 0.15})`,
}))

const flipperStyle = computed(() => ({
  transform: `perspective(600px) rotateY(${turned.value ? 180 : 0}deg)`,
}))
</script>

<template>
  <div class="scene">
    <div class="exit" :style="exitStyle">
      <div class="crouch" :style="crouchStyle">
        <div class="flipper" :style="flipperStyle">
          <svg class="layer front" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="112" rx="55" ry="60" fill="#7ec8a9" />
            <circle cx="72" cy="60" r="13" fill="#7ec8a9" />
            <circle cx="128" cy="60" r="13" fill="#7ec8a9" />
            <ellipse cx="100" cy="128" rx="34" ry="38" fill="#a8dcc0" />
            <ellipse cx="66" cy="112" rx="8" ry="6" fill="#f4a3a3" :opacity="blushOpacity" />
            <ellipse cx="134" cy="112" rx="8" ry="6" fill="#f4a3a3" :opacity="blushOpacity" />
            <ellipse cx="80" cy="95" rx="7" :ry="eyeRy" fill="#ffffff" />
            <ellipse cx="120" cy="95" rx="7" :ry="eyeRy" fill="#ffffff" />
            <circle cx="80" :cy="95 + pupilDy" r="3.5" fill="#2f4f43" />
            <circle cx="120" :cy="95 + pupilDy" r="3.5" fill="#2f4f43" />
            <line
              x1="70"
              y1="80"
              x2="90"
              y2="80"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
              :transform="`rotate(${browTilt} 80 80)`"
            />
            <line
              x1="110"
              y1="80"
              x2="130"
              y2="80"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
              :transform="`rotate(${-browTilt} 120 80)`"
            />
            <path
              :d="mouthPath"
              fill="none"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
          <svg class="layer back" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="112" rx="55" ry="60" fill="#7ec8a9" />
            <circle cx="72" cy="60" r="13" fill="#7ec8a9" />
            <circle cx="128" cy="60" r="13" fill="#7ec8a9" />
            <path
              d="M 100 62 q 10 -16 24 -8 q 12 7 2 16"
              fill="none"
              stroke="#5da88b"
              stroke-width="4"
              stroke-linecap="round"
            />
            <ellipse cx="100" cy="160" rx="14" ry="10" fill="#a8dcc0" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene {
  width: 200px;
  height: 200px;
  overflow: hidden;
}

.exit,
.crouch,
.flipper {
  width: 100%;
  height: 100%;
}

.exit {
  transition: transform 1s ease;
}

.crouch {
  transform-origin: bottom center;
  transition: transform 0.6s ease;
}

.flipper {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.layer {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}

.back {
  transform: rotateY(180deg);
}
</style>
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/Tamagotchi.vue
git commit -m "Add Tamagotchi SVG character component"
```

---

### Task 4: Controls (`src/components/MoodControls.vue`)

**Files:**
- Create: `src/components/MoodControls.vue`

**Interfaces:**
- Consumes: `getWebApp()`, `isTelegram()` from `src/telegram.ts`; `formatRemaining()`, `MOOD_MAX` from `src/tamagotchi.ts`.
- Produces: `MoodControls` component with props `mood: number`, `remainingMs: number | null`, and emits `pet` and `setMood` (payload: `number`).

- [ ] **Step 1: Create `src/components/MoodControls.vue`**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, watchEffect } from 'vue'
import { getWebApp, isTelegram } from '../telegram'
import { formatRemaining, MOOD_MAX } from '../tamagotchi'

const props = defineProps<{ mood: number; remainingMs: number | null }>()
const emit = defineEmits<{ pet: []; setMood: [mood: number] }>()

const webApp = getWebApp()
const inTelegram = isTelegram()

function handlePet(): void {
  emit('pet')
  webApp?.HapticFeedback.impactOccurred('light')
}

function handleSlider(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  emit('setMood', value)
}

watchEffect(() => {
  if (!webApp) {
    return
  }
  if (props.remainingMs !== null) {
    webApp.MainButton.hide()
    return
  }
  webApp.MainButton.setText('Погладить')
  webApp.MainButton.show()
  if (props.mood >= MOOD_MAX) {
    webApp.MainButton.disable()
  } else {
    webApp.MainButton.enable()
  }
})

onMounted(() => {
  webApp?.MainButton.onClick(handlePet)
})

onUnmounted(() => {
  webApp?.MainButton.offClick(handlePet)
  webApp?.MainButton.hide()
})
</script>

<template>
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      Он ушёл. Вернётся через {{ formatRemaining(remainingMs) }}
    </p>
    <template v-else>
      <p class="hint">Настроение падает само. Погладь, чтобы поднять.</p>
      <button
        v-if="!inTelegram"
        class="pet"
        type="button"
        :disabled="mood >= MOOD_MAX"
        @click="handlePet"
      >
        Погладить
      </button>
    </template>
    <label v-if="!inTelegram" class="slider">
      <span>Настроение: {{ Math.round(mood) }}</span>
      <input type="range" min="-100" max="100" :value="mood" @input="handleSlider" />
    </label>
  </section>
</template>

<style scoped>
.controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.hint {
  margin: 0;
  color: var(--tg-hint);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.away {
  margin: 0;
  color: var(--tg-hint);
  font-size: 15px;
  text-align: center;
}

.pet {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}

.pet:disabled {
  opacity: 0.5;
  cursor: default;
}

.slider {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--tg-hint);
  font-size: 13px;
}

.slider input {
  width: 100%;
}
</style>
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/MoodControls.vue
git commit -m "Add MoodControls with MainButton and dev slider"
```

---

### Task 5: Wire into app, remove demo components

**Files:**
- Modify: `src/App.vue` (full rewrite)
- Modify: `src/telegram.ts` (remove the now-unused `mockUser` export)
- Delete: `src/components/UserCard.vue`
- Delete: `src/components/DemoControls.vue`

**Interfaces:**
- Consumes: everything from Tasks 1-4: `createInitialState`, `applyDecay`, `pet`, `TICK_MS`, `MOOD_MIN`, `TamagotchiState`; `loadState`, `saveState`; `Tamagotchi` and `MoodControls` components; `getWebApp`, `isTelegram`, `TelegramThemeParams`.
- Produces: the complete app; no exports consumed by later tasks.

- [ ] **Step 1: Replace `src/App.vue`**

```vue
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
  state.value = { mood, lastSeen: now.value, awayUntil: null }
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
</style>
```

- [ ] **Step 2: Remove the unused `mockUser` export from `src/telegram.ts`**

Delete this block:

```ts
export const mockUser: TelegramWebAppUser = {
  id: 1,
  first_name: 'Test',
  last_name: 'User',
  username: 'test_user',
  language_code: 'en',
  is_premium: false,
}
```

- [ ] **Step 3: Delete the demo components**

```bash
git rm src/components/UserCard.vue src/components/DemoControls.vue
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Verify in browser**

Run (background): `npm run dev`
Check with a headless browser if available (e.g. `google-chrome --headless --dump-dom http://localhost:5173/`): the DOM contains the character (`class="scene"`) and the text `Настроение:`; no console errors.
Manual: moving the dev slider to `+100` shows a smiling face; to `0` the character turns its back; to `-50` it is hunched with its back turned; to `-100` it slides off the left edge. Clicking «Погладить» raises the mood by 20. Reloading the page keeps the mood (localStorage).
Stop the dev server afterwards.

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/telegram.ts
git commit -m "Wire tamagotchi into app and remove demo components"
```

---

### Task 6: Documentation (`README.MD`, `AGENTS.md`)

**Files:**
- Modify: `README.MD` (full rewrite)
- Modify: `AGENTS.md` (full rewrite)

**Interfaces:**
- Consumes: the finished app from Tasks 1-5.
- Produces: user-facing documentation; no code interfaces.

- [ ] **Step 1: Rewrite `README.MD`**

````markdown
# i_promise — Тамагочи в Telegram Mini App

Тамагочи с одним параметром — настроением. Настроение падает само со временем,
кнопкой «Погладить» его можно поднять. Персонаж нарисован кодом (SVG): грустнеет
лицом, при нуле поворачивается спиной, при −100 уходит с экрана и возвращается
сам через 2 часа.

## Механика

| Параметр | Значение |
| --- | --- |
| Настроение | от −100 до +100, старт +100 |
| Падает | −20 в час |
| Кнопка «Погладить» | +20 |
| Уходит | при −100 |
| Возвращается | через 2 часа с настроением −50 |

## Хранение состояния

Состояние (настроение, время последнего взаимодействия, время возврата)
хранится в **Telegram CloudStorage** — облаке Telegram, отдельно для каждого
пользователя бота. База данных и бэкенд не нужны. В браузерном режиме
используется `localStorage`, чтобы состояние переживало перезагрузку страницы.

Важно: приложение не проверяет подпись `initData` на сервере (сервера нет).
Для реального приложения с наградами или платежами такую проверку нужно
добавлять.

## Требования

- Node.js 20.19+ или 22.12+

## Команды

- `npm install` — установить зависимости
- `npm run dev` — dev-сервер на http://localhost:5173
- `npm run typecheck` — проверка типов (`vue-tsc --noEmit`)
- `npm run build` — проверка типов и сборка в `dist/`
- `npm run preview` — локальный просмотр собранной версии

В обычном браузере приложение открывается с баннером, кнопкой и ползунком
настроения — это режим разработки: ползунок позволяет посмотреть все
состояния персонажа, не дожидаясь падения настроения.

## Как подключить к боту

1. Собери и выложи приложение на любой HTTPS-хостинг
   (GitHub Pages, Vercel, Netlify, ...):

   ```bash
   npm run build
   # залей содержимое dist/ на хостинг
   ```

2. Укажи URL в BotFather:
   - `/newapp` — создать Mini App и указать URL; или
   - `/mybots` → выбрать бота → Bot Settings → Menu Button → указать URL
     (или команда `/setmenubutton`).

3. Открой бота в Telegram и нажми кнопку меню — приложение загрузится
   внутри Telegram, настроение начнёт храниться в CloudStorage.

### Хостинг в подкаталоге

Если приложение лежит не в корне домена (например, GitHub Pages
`https://user.github.io/repo/`), укажи путь в `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [vue()],
  base: '/repo/',
})
```

и пересобери проект.

## Структура

- `index.html` — подключает официальный скрипт
  `https://telegram.org/js/telegram-web-app.js`
- `src/telegram.ts` — типы и безопасный доступ к `window.Telegram.WebApp`
- `src/tamagotchi.ts` — чистая логика настроения (константы, `applyDecay`, `pet`)
- `src/storage.ts` — сохранение состояния (CloudStorage → localStorage)
- `src/App.vue` — оркестрация: загрузка состояния, тик раз в минуту, тема
- `src/components/Tamagotchi.vue` — SVG-персонаж и анимации
- `src/components/MoodControls.vue` — MainButton, браузерные кнопка и ползунок

## Полезные ссылки

- Документация Mini Apps: https://docs.telegram-mini-apps.com/
- Официальная документация Telegram: https://core.telegram.org/bots/webapps
````

- [ ] **Step 2: Rewrite `AGENTS.md`**

```markdown
# AGENTS.md

## Project

Tamagotchi Telegram Mini App: Vue 3 + Vite + TypeScript, no backend. A single
parameter — mood (see README for mechanics).

The Telegram WebApp API is loaded via the script tag in `index.html`
(https://telegram.org/js/telegram-web-app.js) — do NOT add it as an npm
dependency. All Telegram API access must go through `src/telegram.ts`.
All persistence must go through `src/storage.ts`.

## Commits

- Commit messages MUST be written in English only.
- Keep commits small and focused; one logical change per commit.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build to `dist/`
- `npm run typecheck` — run `vue-tsc --noEmit`
- `npm run preview` — preview the production build

## Conventions

- Vue 3 SFCs with `<script setup lang="ts">`.
- UI chrome colors come only from the Telegram theme CSS custom properties
  (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`,
  `--tg-secondary-bg`) defined in `src/App.vue`. The character palette in
  `Tamagotchi.vue` is intentionally fixed.
- Game logic lives in `src/tamagotchi.ts` as pure functions; components stay
  presentational.
- No backend or network calls; outside Telegram the app runs in browser mode
  (localStorage + dev controls).
```

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add README.MD AGENTS.md
git commit -m "Update README and AGENTS.md for tamagotchi"
```

---

## Manual end-to-end check (after all tasks)

1. `npm run dev` in a browser:
   - slider `+100` → smiling face, «Погладить» disabled at max;
   - slider `0` → turned back;
   - slider `−50` → back turned, hunched;
   - slider `−100` → slides off the left edge;
   - reload keeps the mood (localStorage).
2. `npm run build`, deploy `dist/` over HTTPS, open from the bot:
   - the character appears, MainButton says «Погладить»;
   - tapping it raises mood with a haptic tick;
   - reopen the app later — mood has decayed and persisted (CloudStorage);
   - at −100 the character leaves and the countdown message appears.
