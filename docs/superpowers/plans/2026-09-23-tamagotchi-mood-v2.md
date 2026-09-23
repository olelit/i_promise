# Tamagotchi Stage 1: Mood, Indicator, Feeding, Body — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace petting with a once-a-day feeding (cap +20), add a vertical color mood indicator to the right of the character, and give the character a full body.

**Architecture:** Pure feed logic joins the existing pure mood functions in `src/tamagotchi.ts`; `lastFedAt` is added to the persisted state with backward-compatible storage validation; a new presentational `MoodIndicator.vue` renders the meter; `MoodControls.vue` becomes feed-only; `App.vue` composes the character row and wires feeding.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, vue-tsc 3.3, official Telegram WebApp script.

## Global Constraints

- Commit messages MUST be written in English only.
- All Telegram API access goes through `src/telegram.ts`; never add a Telegram npm SDK.
- All persistence goes through `src/storage.ts`.
- No backend, no network requests.
- Vue SFCs use `<script setup lang="ts">`; TypeScript strict mode.
- UI chrome colors come only from the theme CSS custom properties defined in `App.vue`; the character palette is fixed: body `#7ec8a9`, belly `#a8dcc0`, features `#2f4f43`, blush `#f4a3a3`, back curl `#5da88b`.
- Decay stays `-20`/hour, away at `-100`, return after `2h` at `-50`.
- Feeding: `+20`, never above `20`, once per `24h`, impossible while away.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Feed logic and state migration

**Files:**
- Modify: `src/tamagotchi.ts`
- Modify: `src/storage.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TamagotchiState` with `lastFedAt: number | null`; constants `FEED_GAIN`, `FEED_CAP`, `FEED_COOLDOWN_MS`; functions `canFeed(state, now): boolean`, `feed(state, now): TamagotchiState`, `feedCooldownRemaining(state, now): number | null`. `pet` and `PET_GAIN` stay temporarily (the old UI still uses them) and are removed in Task 4.

- [ ] **Step 1: Replace `src/tamagotchi.ts`**

```ts
export interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
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
export const PET_GAIN = 20

const HOUR_MS = 3_600_000

export function createInitialState(now: number): TamagotchiState {
  return { mood: INITIAL_MOOD, lastSeen: now, awayUntil: null, lastFedAt: null }
}

export function applyDecay(state: TamagotchiState, now: number): TamagotchiState {
  if (state.awayUntil !== null) {
    if (now >= state.awayUntil) {
      return { mood: RETURN_MOOD, lastSeen: now, awayUntil: null, lastFedAt: state.lastFedAt }
    }
    return state
  }

  const hours = (now - state.lastSeen) / HOUR_MS
  const mood = Math.min(MOOD_MAX, Math.max(MOOD_MIN, state.mood - hours * DECAY_PER_HOUR))

  if (mood <= MOOD_MIN) {
    return {
      mood: MOOD_MIN,
      lastSeen: now,
      awayUntil: now + AWAY_DURATION_MS,
      lastFedAt: state.lastFedAt,
    }
  }

  return { mood, lastSeen: state.lastSeen, awayUntil: null, lastFedAt: state.lastFedAt }
}

export function feedCooldownRemaining(state: TamagotchiState, now: number): number | null {
  if (state.awayUntil !== null || state.lastFedAt === null) {
    return null
  }
  const remaining = state.lastFedAt + FEED_COOLDOWN_MS - now
  return remaining > 0 ? remaining : null
}

export function canFeed(state: TamagotchiState, now: number): boolean {
  if (state.awayUntil !== null) {
    return false
  }
  return feedCooldownRemaining(state, now) === null
}

export function feed(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: Math.min(FEED_CAP, state.mood + FEED_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: now,
  }
}

export function pet(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: Math.min(MOOD_MAX, state.mood + PET_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: state.lastFedAt,
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

- [ ] **Step 2: Update `src/storage.ts` validation**

Add `lastFedAt` to the guard and normalize old states. Replace `isValidState` and `parseState` with:

```ts
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
  return moodOk && lastSeenOk && awayOk && lastFedOk
}

function normalizeState(state: TamagotchiState): TamagotchiState {
  return { ...state, lastFedAt: state.lastFedAt ?? null }
}

function parseState(raw: string | null | undefined): TamagotchiState | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidState(parsed) ? normalizeState(parsed) : null
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Patch the temporary state literal in `src/App.vue`**

The old dev slider builds a state object by hand; add the new field so the app
still typechecks until Task 4 replaces the file:

```ts
function handleSetMood(mood: number): void {
  now.value = Date.now()
  state.value = { mood, lastSeen: now.value, awayUntil: null, lastFedAt: null }
  void saveState(state.value)
}
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/tamagotchi.ts src/storage.ts src/App.vue
git commit -m "Replace petting with daily feeding logic"
```

---

### Task 2: Mood indicator component

**Files:**
- Create: `src/components/MoodIndicator.vue`

**Interfaces:**
- Consumes: `MOOD_MAX`, `MOOD_MIN` from `src/tamagotchi.ts`.
- Produces: `MoodIndicator` component with a single prop `mood: number`.

- [ ] **Step 1: Create `src/components/MoodIndicator.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'

const props = defineProps<{ mood: number }>()

const fraction = computed(() =>
  Math.min(1, Math.max(0, (props.mood - MOOD_MIN) / (MOOD_MAX - MOOD_MIN))),
)
const hue = computed(() => 120 * Math.min(1, Math.max(0, props.mood / MOOD_MAX)))
const fillStyle = computed(() => ({
  height: `${fraction.value * 100}%`,
  background: `hsl(${hue.value}, 70%, 45%)`,
}))
</script>

<template>
  <div
    class="meter"
    role="meter"
    aria-label="Настроение"
    :aria-valuemin="MOOD_MIN"
    :aria-valuemax="MOOD_MAX"
    :aria-valuenow="Math.round(mood)"
  >
    <div class="fill" :style="fillStyle"></div>
  </div>
</template>

<style scoped>
.meter {
  width: 14px;
  height: 160px;
  border-radius: 7px;
  background: var(--tg-secondary-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.fill {
  width: 100%;
  border-radius: 7px;
  transition: height 0.6s ease, background 0.6s ease;
}
</style>
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/MoodIndicator.vue
git commit -m "Add vertical mood indicator"
```

---

### Task 3: Full-body character

**Files:**
- Modify: `src/components/Tamagotchi.vue` (replace the two SVGs with full-body versions; keep all animation logic and CSS)

**Interfaces:**
- Consumes: `MOOD_MAX` from `src/tamagotchi.ts`.
- Produces: same public interface — props `{ mood: number; away: boolean }`.

- [ ] **Step 1: Replace the template's two `<svg>` blocks**

Front view (inside `<Transition name="flip" mode="out-in">`, `v-if="!turned"`):

```html
          <svg v-if="!turned" key="front" class="face" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="78" rx="42" ry="40" fill="#7ec8a9" />
            <circle cx="66" cy="44" r="11" fill="#7ec8a9" />
            <circle cx="134" cy="44" r="11" fill="#7ec8a9" />
            <ellipse cx="100" cy="146" rx="34" ry="38" fill="#7ec8a9" />
            <ellipse cx="100" cy="156" rx="22" ry="26" fill="#a8dcc0" />
            <line
              x1="68"
              y1="128"
              x2="52"
              y2="156"
              stroke="#7ec8a9"
              stroke-width="14"
              stroke-linecap="round"
            />
            <line
              x1="132"
              y1="128"
              x2="148"
              y2="156"
              stroke="#7ec8a9"
              stroke-width="14"
              stroke-linecap="round"
            />
            <ellipse cx="80" cy="186" rx="14" ry="9" fill="#7ec8a9" />
            <ellipse cx="120" cy="186" rx="14" ry="9" fill="#7ec8a9" />
            <ellipse cx="74" cy="84" rx="7" ry="5" fill="#f4a3a3" :opacity="blushOpacity" />
            <ellipse cx="126" cy="84" rx="7" ry="5" fill="#f4a3a3" :opacity="blushOpacity" />
            <ellipse cx="80" cy="70" rx="6.5" :ry="eyeRy" fill="#ffffff" />
            <ellipse cx="120" cy="70" rx="6.5" :ry="eyeRy" fill="#ffffff" />
            <circle cx="80" :cy="70 + pupilDy" r="3.2" fill="#2f4f43" />
            <circle cx="120" :cy="70 + pupilDy" r="3.2" fill="#2f4f43" />
            <line
              x1="72"
              y1="56"
              x2="88"
              y2="56"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
              :transform="`rotate(${browTilt} 80 56)`"
            />
            <line
              x1="112"
              y1="56"
              x2="128"
              y2="56"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
              :transform="`rotate(${-browTilt} 120 56)`"
            />
            <path
              :d="mouthPath"
              fill="none"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
```

Back view (`v-else`):

```html
          <svg v-else key="back" class="face" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="78" rx="42" ry="40" fill="#7ec8a9" />
            <circle cx="66" cy="44" r="11" fill="#7ec8a9" />
            <circle cx="134" cy="44" r="11" fill="#7ec8a9" />
            <path
              d="M 100 44 q 8 -14 20 -7 q 10 6 2 14"
              fill="none"
              stroke="#5da88b"
              stroke-width="4"
              stroke-linecap="round"
            />
            <ellipse cx="100" cy="146" rx="34" ry="38" fill="#7ec8a9" />
            <line
              x1="68"
              y1="128"
              x2="52"
              y2="156"
              stroke="#7ec8a9"
              stroke-width="14"
              stroke-linecap="round"
            />
            <line
              x1="132"
              y1="128"
              x2="148"
              y2="156"
              stroke="#7ec8a9"
              stroke-width="14"
              stroke-linecap="round"
            />
            <ellipse cx="80" cy="186" rx="14" ry="9" fill="#7ec8a9" />
            <ellipse cx="120" cy="186" rx="14" ry="9" fill="#7ec8a9" />
            <ellipse cx="100" cy="162" rx="12" ry="9" fill="#a8dcc0" />
          </svg>
```

- [ ] **Step 2: Update the mouth path for the new face position**

Replace the `mouthPath` computed with:

```ts
const mouthPath = computed(() => {
  const curve = 20 * t.value - 12
  return `M 82 96 Q 100 ${96 + curve} 118 96`
})
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 4: Visual check**

Run the dev server in the background and take headless screenshots at 390x700 in browser mode: the character must have a head, torso, arms and feet; no clipping inside the 200x200 scene.
Kill the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/components/Tamagotchi.vue
git commit -m "Give the character a full body"
```

---

### Task 4: Feed controls and app wiring

**Files:**
- Modify: `src/components/MoodControls.vue` (full rewrite)
- Modify: `src/App.vue` (full rewrite)

**Interfaces:**
- Consumes: `canFeed`, `feed`, `feedCooldownRemaining`, `TamagotchiState`, plus existing `applyDecay`, `createInitialState`, `TICK_MS`, `MOOD_MIN`, `loadState`, `saveState`; components `Tamagotchi`, `MoodIndicator`, `MoodControls`.
- Produces: the stage-1 app.

- [ ] **Step 1: Replace `src/components/MoodControls.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { formatRemaining } from '../tamagotchi'

const props = defineProps<{ remainingMs: number | null; nextFeedMs: number | null }>()
const emit = defineEmits<{ feed: [] }>()

const feedLabel = computed(() =>
  props.nextFeedMs === null ? 'ПОКОРМИТЬ' : `Покормить через ${formatRemaining(props.nextFeedMs)}`,
)

function handleFeed(): void {
  emit('feed')
}
</script>

<template>
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      Он ушёл. Вернётся через {{ formatRemaining(remainingMs) }}
    </p>
    <template v-else>
      <p class="hint">Настроение падает само. Покорми раз в день, чтобы поднять.</p>
      <button class="feed" type="button" :disabled="nextFeedMs !== null" @click="handleFeed">
        {{ feedLabel }}
      </button>
    </template>
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

.feed {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}

.feed:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
```

- [ ] **Step 2: Replace `src/App.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getWebApp, isTelegram, type TelegramThemeParams } from './telegram'
import {
  applyDecay,
  canFeed,
  createInitialState,
  feed as feedState,
  feedCooldownRemaining,
  MOOD_MIN,
  TICK_MS,
  type TamagotchiState,
} from './tamagotchi'
import { loadState, saveState } from './storage'
import Tamagotchi from './components/Tamagotchi.vue'
import MoodIndicator from './components/MoodIndicator.vue'
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
const nextFeedMs = computed(() => feedCooldownRemaining(current.value, now.value))

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
      <div class="pet-row">
        <Tamagotchi :mood="current.mood" :away="away" />
        <MoodIndicator :mood="current.mood" />
      </div>
      <MoodControls :remaining-ms="remainingMs" :next-feed-ms="nextFeedMs" @feed="handleFeed" />
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

.pet-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
```

- [ ] **Step 3: Remove the temporary `pet` API from `src/tamagotchi.ts`**
Delete the `PET_GAIN` constant and the `pet` function (no longer referenced):

```ts
export const PET_GAIN = 20
```

```ts
export function pet(state: TamagotchiState, now: number): TamagotchiState {
  return {
    mood: Math.min(MOOD_MAX, state.mood + PET_GAIN),
    lastSeen: now,
    awayUntil: state.awayUntil,
    lastFedAt: state.lastFedAt,
  }
}
```

- [ ] **Step 4: Reduce the crouch sink so the feet stay inside the scene**

`src/components/Tamagotchi.vue` now has feet at y≈195 and the crouch moves the
body down by up to 12px, so at maximum crouch the feet clip against the
scene's `overflow: hidden`. Change the crouch offset from `12` to `4`:

```ts
const crouchStyle = computed(() => ({
  transform: `translateY(${crouch.value * 4}px) scaleY(${1 - crouch.value * 0.15})`,
}))
```

- [ ] **Step 5: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 6: Browser checks (headless, state injected before app scripts)**

Inject `localStorage['tamagotchi-state']` via CDP
`Page.addScriptToEvaluateOnNewDocument` before loading `http://localhost:5173/`, then verify:
- `{ mood: 100, lastSeen: now, awayUntil: null, lastFedAt: null }` → indicator full and green-ish (`hsl(120, ...)`), feed button «ПОКОРМИТЬ» enabled;
- `{ mood: 50, ... }` → yellow-ish (`hsl(60, ...)`), half fill;
- `{ mood: 0, ... }` → red (`hsl(0, ...)`), half fill;
- `{ mood: -50, ... }` → red, quarter fill, character turned back;
- `{ mood: 0, lastFedAt: now - 3600_000 }` → feed button disabled with a countdown;
- `{ mood: -100, awayUntil: now + 3600_000 }` → away message, no feed button.
Clicking the enabled feed button raises mood by 20 (cap 20) and persists it.
Kill the dev server afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/components/MoodControls.vue src/App.vue src/tamagotchi.ts src/components/Tamagotchi.vue
git commit -m "Wire daily feeding and mood indicator into the app"
```

---

### Task 5: Documentation

**Files:**
- Modify: `README.MD` (mechanics table and structure section)

**Interfaces:**
- Consumes: the stage-1 app.
- Produces: docs; no code interfaces.

- [ ] **Step 1: Update the mechanics table in `README.MD`**

Replace the existing «Механика» table rows about «Кнопка Погладить» with:

```markdown
| Параметр | Значение |
| --- | --- |
| Настроение | от −100 до +100, старт +100 |
| Падает | −20 в час |
| Кнопка «ПОКОРМИТЬ» | раз в 24 часа, +20, но не выше +20 |
| Индикатор | вертикальный столбик справа: зелёный на 100, жёлтый на 50, красный на 0 и ниже |
| Уходит | при −100 |
| Возвращается | через 2 часа с настроением −50 |
```

- [ ] **Step 2: Update the structure list**

Add `src/components/MoodIndicator.vue` — «вертикальный индикатор настроения», and adjust the `MoodControls.vue` description to «кнопка ПОКОРМИТЬ и таймеры».

- [ ] **Step 3: Verify build and commit**

Run: `npm run build` → exits 0.

```bash
git add README.MD
git commit -m "Document feeding and mood indicator"
```
