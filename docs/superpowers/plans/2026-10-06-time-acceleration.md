# Tamagotchi Stage 18: Time Acceleration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the manual mood slider and add a game-time speed control (⏸ / 1× / 60× / 600×) in the bottom action row, available in the browser and in Telegram, so all game time — mood decay, task deadlines, away/return, feed cooldown, day/night — can be studied at speed.

**Architecture:** A persisted `clockOffset` (game time minus real time) in `TamagotchiState`; game now is `Date.now() + clockOffset`. Every existing pure function already takes `now`, so no `tamagotchi.ts` logic changes beyond carrying the field. `App.vue` owns a session-only speed (reset to 1× on launch), advances the offset per tick, and throttles offset saves. `MoodIndicator.vue` loses its input; a new presentational `TimeControls.vue` drives the speed.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9.

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no other network calls.
- `<script setup lang="ts">`, strict TS; game world uses `src/pixel/palette.ts`, native chrome only the Telegram theme variables (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`, `--tg-secondary-bg`).
- No new dependencies.
- Speed is session-only: it ALWAYS starts at 1×; only the offset persists.
- No test suite: verification is `npm run typecheck` + `npm run build` plus the listed checks. The user does not review specs/plans.
- All implementation work goes through subagents (implementer + reviewer per task).

---

### Task 1: Virtual clock offset in the state and storage

**Files:**
- Modify: `src/tamagotchi.ts`, `src/storage.ts`

**Interfaces:**
- Produces: `TamagotchiState.clockOffset: number`;
  `TIME_SPEEDS = [0, 1, 60, 600] as const`; `type TimeSpeed`;
  `DEFAULT_TIME_SPEED: TimeSpeed = 1`; `FAST_TICK_MS = 1_000`;
  `advanceClockOffset(offset: number, realDelta: number, speed: TimeSpeed): number`.
- Consumes: nothing.

- [ ] **Step 1: Add the offset, speed constants and helper to `src/tamagotchi.ts`**

Add `clockOffset` to the interface:

```ts
export interface TamagotchiState {
  mood: number
  clockOffset: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
  task: TamagotchiTask | null
  skin: SkinId
  rulesSent: boolean
  history: TaskRecord[]
}
```

Next to `TICK_MS` add:

```ts
export const TICK_MS = 60_000
export const FAST_TICK_MS = 1_000
export const TIME_SPEEDS = [0, 1, 60, 600] as const
export type TimeSpeed = (typeof TIME_SPEEDS)[number]
export const DEFAULT_TIME_SPEED: TimeSpeed = 1
```

Add the pure helper after the constants:

```ts
export function advanceClockOffset(
  offset: number,
  realDelta: number,
  speed: TimeSpeed,
): number {
  return offset + realDelta * (speed - 1)
}
```

- [ ] **Step 2: Carry `clockOffset` through every literal state return in `src/tamagotchi.ts`**

- `createInitialState`: add `clockOffset: 0,` after `mood: INITIAL_MOOD,`.
- `applyDecay`:
  - the overdue branch (`mood: 0`) — add `clockOffset: state.clockOffset,`;
  - the `now >= state.awayUntil` branch (`mood: RETURN_MOOD`) — same;
  - the `mood <= MOOD_MIN` branch (`mood: MOOD_MIN`) — same;
  - the final normal-decay return — same.
- `feed`: the literal return — add `clockOffset: state.clockOffset,`.
- `startTask`: the literal return — add `clockOffset: state.clockOffset,`.
- `completeTask`, `extendTask`, `abandonTask` already spread `...state`; no change.
- The `if (state.awayUntil !== null)` early `return state` is unchanged.

- [ ] **Step 3: Validate and normalize `clockOffset` in `src/storage.ts`**

In `isValidState` add next to the other checks:

```ts
  const offsetOk =
    candidate.clockOffset === undefined ||
    (typeof candidate.clockOffset === 'number' && Number.isFinite(candidate.clockOffset))
```

and include `offsetOk` in the final `return` expression (e.g. after `taskOk`).

In `normalizeState`, next to `skin:` add:

```ts
    clockOffset:
      typeof state.clockOffset === 'number' && Number.isFinite(state.clockOffset)
        ? state.clockOffset
        : 0,
```

- [ ] **Step 4: Verify with typecheck, build and an SSR logic script**

Run:

```bash
npm run typecheck && npm run build
```

Expected: both pass.

Create `/tmp/check-clock.mjs`:

```js
import { createServer } from 'vite'

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
})
const mod = await server.ssrLoadModule('/src/tamagotchi.ts')
const assert = (ok, message) => {
  if (!ok) {
    console.error('FAIL:', message)
    process.exitCode = 1
  }
}
assert(mod.advanceClockOffset(0, 1000, 60) === 59000, '60x adds 59 s')
assert(mod.advanceClockOffset(1000, 1000, 1) === 1000, '1x keeps the offset')
assert(mod.advanceClockOffset(1000, 1000, 0) === 0, 'pause subtracts real time')
assert(mod.advanceClockOffset(0, 500, 600) === 299500, '600x adds 599x')
const state = mod.createInitialState(0)
assert(state.clockOffset === 0, 'initial offset')
const decayed = mod.applyDecay({ ...state, mood: 100, lastSeen: 0 }, 3_600_000)
assert(decayed.clockOffset === 0, 'applyDecay keeps the offset')
const fed = mod.feed({ ...state, mood: 0, lastSeen: 0, lastFedAt: null, awayUntil: null }, 0)
assert(fed.clockOffset === 0, 'feed keeps the offset')
const started = mod.startTask({ ...state, lastSeen: 0 }, { hours: 2, description: 'x' }, 0)
assert(started.clockOffset === 0, 'startTask keeps the offset')
const done = mod.completeTask(started, 1)
assert(done.clockOffset === 0 && done.history.length === 1, 'completeTask keeps the offset')
console.log('clock checks done')
await server.close()
```

Run from the repo root: `node /tmp/check-clock.mjs`
Expected: `clock checks done` with no `FAIL:` lines.

- [ ] **Step 5: Commit**

```bash
git add src/tamagotchi.ts src/storage.ts
git commit -m "Add the virtual clock offset to the state"
```

---

### Task 2: Remove the manual mood slider

**Files:**
- Modify: `src/components/MoodIndicator.vue`, `src/App.vue`

**Interfaces:**
- Consumes: nothing.
- Produces: `MoodIndicator` props become `{ mood: number }` only (no `interactive`, no `set-mood` emit). `App.vue` no longer imports `AWAY_DURATION_MS` and no longer has `handleSetMood`/`scheduleSave`/`saveTimer`.

- [ ] **Step 1: Strip the input from `src/components/MoodIndicator.vue`**

Script becomes:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'
import { PALETTE } from '../pixel/palette'
import { m, messages } from '../i18n'

const props = defineProps<{ mood: number }>()

const SEGMENTS = 20

const fraction = computed(() =>
  Math.min(1, Math.max(0, (props.mood - MOOD_MIN) / (MOOD_MAX - MOOD_MIN))),
)
const lit = computed(() => Math.round(fraction.value * SEGMENTS))
const segments = computed(() =>
  Array.from({ length: SEGMENTS }, (_, index) => {
    const value = MOOD_MIN + ((index + 0.5) * (MOOD_MAX - MOOD_MIN)) / SEGMENTS
    return value < 0 ? PALETTE.r : value <= 50 ? PALETTE.S : PALETTE.T
  }),
)
</script>
```

Template: remove the `:aria-hidden` binding from `.meter`, delete the whole `<input v-if="interactive" class="range" ...>` element. The `.meter` keeps `role="meter"`, `:aria-label="m(messages.mood)"`, `aria-valuemin/max/now`.

Styles: delete the `.range` rule and the `.meter-wrap:focus-within .meter` rule; everything else stays.

- [ ] **Step 2: Clean up `src/App.vue`**

- Remove `AWAY_DURATION_MS,` from the `./tamagotchi` import list.
- Delete the `handleSetMood` function entirely.
- Delete `let saveTimer: number | undefined` and the whole `scheduleSave` function.
- In `onUnmounted`, replace the `if (saveTimer !== undefined) { ... }` block with a plain `void saveState(state.value)` line placed where that block was.
- Template: change `<MoodIndicator :mood="current.mood" interactive @set-mood="handleSetMood" />` to `<MoodIndicator :mood="current.mood" />`.

- [ ] **Step 3: Verify**

Run:

```bash
npm run typecheck && npm run build
rg -n "setMood|set-mood|interactive|scheduleSave|saveTimer|AWAY_DURATION_MS" src
```

Expected: typecheck/build pass; `rg` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add src/components/MoodIndicator.vue src/App.vue
git commit -m "Remove the manual mood slider"
```

---

### Task 3: Time controls and the running virtual clock

**Files:**
- Create: `src/components/TimeControls.vue`
- Modify: `src/App.vue`, `src/i18n.ts`

**Interfaces:**
- Consumes: `advanceClockOffset`, `DEFAULT_TIME_SPEED`, `FAST_TICK_MS`, `TimeSpeed` from Task 1; the trimmed `MoodIndicator` from Task 2.
- Produces: `TimeControls` props `{ speed: TimeSpeed }`, emit `select: [speed: TimeSpeed]`; `App.vue` helpers `gameNow()`, `syncClock(force?: boolean)`, `restartTimer()`, `handleSpeedSelect(next: TimeSpeed)`.

- [ ] **Step 1: Create `src/components/TimeControls.vue`**

```vue
<script setup lang="ts">
import { m, messages } from '../i18n'
import { TIME_SPEEDS, type TimeSpeed } from '../tamagotchi'

defineProps<{ speed: TimeSpeed }>()
const emit = defineEmits<{ select: [speed: TimeSpeed] }>()

function text(value: TimeSpeed): string {
  return value === 0 ? '⏸' : `${value}×`
}

function aria(value: TimeSpeed): string {
  return value === 0 ? m(messages.timePause) : `${value}×`
}
</script>

<template>
  <div class="time-controls" role="group" :aria-label="m(messages.time)">
    <button
      v-for="value in TIME_SPEEDS"
      :key="value"
      class="speed-button"
      :class="{ active: value === speed }"
      type="button"
      :aria-pressed="value === speed"
      :aria-label="aria(value)"
      @click="emit('select', value)"
    >
      {{ text(value) }}
    </button>
  </div>
</template>

<style scoped>
.time-controls {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--tg-secondary-bg);
}

.speed-button {
  min-width: 44px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--tg-hint);
  font-size: 14px;
  cursor: pointer;
}

.speed-button.active {
  background: var(--tg-button);
  color: var(--tg-button-text);
}
</style>
```

- [ ] **Step 2: Add the i18n strings in `src/i18n.ts`**

In `messages`, next to `mood`:

```ts
  time: { ru: 'Время', en: 'Time' },
  timePause: { ru: 'Пауза', en: 'Pause' },
```

- [ ] **Step 3: Add the clock to `src/App.vue`**

Imports: add `advanceClockOffset,`, `DEFAULT_TIME_SPEED,`, `FAST_TICK_MS,` and `type TimeSpeed,` to the `./tamagotchi` import; add `import TimeControls from './components/TimeControls.vue'`.

After `const state = ref<TamagotchiState>(createInitialState(Date.now()))` add:

```ts
const speed = ref<TimeSpeed>(DEFAULT_TIME_SPEED)
const CLOCK_SAVE_MS = 5_000
let lastReal = Date.now()
let offsetSavedAt = 0
```

After the `remainingMs`/`nextFeedMs` computeds (before `phrase`) add:

```ts
function gameNow(): number {
  return Date.now() + state.value.clockOffset
}

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
```

Notes for the implementer: `timer` is declared later in the file as `let timer: number | undefined` and `tick`/`saveState`/`restartTimer` are hoisted function declarations, so this placement is safe; `restartTimer` is only ever called from `onMounted` and `handleSpeedSelect`, well after setup finishes.

Replace `tick`:

```ts
function tick(): void {
  syncClock()
  commitTransitions()
  checkMilestones(true)
}
```

- [ ] **Step 4: Route every action through game time in `src/App.vue`**

Replace `now.value = Date.now()` with `now.value = gameNow()` in: `handleFeed`, `handleTaskStart`, `handleTaskComplete`, `handleTaskExtend`, `handleTaskAbandon`, `handleSkinSelect`, `requestRules`.

In `handleVisibility`, replace the first line `now.value = Date.now()` with `syncClock(true)` instead, so the elapsing offset is caught up (and saved) on every visibility change before the hidden/visible branches run.

- [ ] **Step 5: Start the timer on mount and persist on unmount**

In `onMounted`: replace `now.value = Date.now()` with `now.value = gameNow()` and replace `timer = window.setInterval(tick, TICK_MS)` with `restartTimer()`.

In `onUnmounted`: replace `void saveState(state.value)` with `syncClock(true)` (it updates the offset and saves).

- [ ] **Step 6: Put the control in the bottom row**

In the template, inside `.task-actions`, after `<FeedButton ... />` add:

```html
        <TimeControls :speed="speed" @select="handleSpeedSelect" />
```

- [ ] **Step 7: Verify**

Run:

```bash
npm run typecheck && npm run build
rg -n "Date.now\(\)" src/App.vue
```

Expected: typecheck/build pass. The remaining `Date.now()` hits are only: the `state`/`now` ref initializers, `lastReal` initializer, inside `gameNow()`, inside `syncClock()`, inside `handleSpeedSelect()`, and `hiddenAt = Date.now()` (real-world elapsed time for the greeting — intentional).

Smoke test the dev server:

```bash
npm run dev &
sleep 3
curl -sf http://localhost:5173/ >/dev/null && echo "dev server OK"
kill %1
```

Expected: `dev server OK`.

- [ ] **Step 8: Commit**

```bash
git add src/components/TimeControls.vue src/App.vue src/i18n.ts
git commit -m "Add the game-time speed control"
```

---

### Task 4: Document the speed control

**Files:**
- Modify: `README.MD`, `AGENTS.md`

**Interfaces:**
- Consumes: the final behavior from Tasks 1–3.
- Produces: documentation only.

- [ ] **Step 1: Update `README.MD`**

- In the intro paragraph 2, delete the sentence
  `Полосу настроения можно перетаскивать, чтобы посмотреть все состояния.`
- In the «Задачи» bullet list, change the last bullet
  `Если персонаж ушёл, начатая задача возвращает его; полосу настроения можно перетаскивать, чтобы посмотреть разные состояния`
  to `Если персонаж ушёл, начатая задача возвращает его.`
- Add a new section after the «Механика» table (before «### Задачи»):

```markdown
### Скорость времени

В нижнем ряду есть переключатель скорости игрового времени: ⏸ (пауза),
1×, 60× и 600×. Он ускоряет всё разом — падение настроения, дедлайны задач,
уход и возвращение, кулдаун кормления и смену дня и ночи. При каждом запуске
скорость сбрасывается на 1×, а игровое время не откатывается назад: в
состоянии хранится смещение `clockOffset` между игровым и реальным временем.
```

- In «Хранение состояния», add `clockOffset` to the stored object list, i.e.
  `{ mood, clockOffset, lastSeen, awayUntil, lastFedAt, task, skin, rulesSent, history }`
  and mention it as «смещение игрового времени».
- In «Структура», after the `FeedButton.vue` line add
  `- \`src/components/TimeControls.vue\` — переключатель скорости игрового времени`
- In the browser paragraph near the end («В обычном браузере приложение открывается…»), add the speed switch to the bottom row list.

- [ ] **Step 2: Update `AGENTS.md`**

Change the last line `Outside Telegram the app runs in browser mode (localStorage + dev controls).` to `Outside Telegram the app runs in browser mode (localStorage).` — the slider was the last manual control and it is gone.

- [ ] **Step 3: Verify**

Run:

```bash
rg -n "перетаскивать|dev controls|clockOffset|TimeControls|Скорость времени" README.MD AGENTS.md
npm run typecheck && npm run build
```

Expected: no `перетаскивать` and no `dev controls` matches; `clockOffset`, `TimeControls` and `Скорость времени` present in `README.MD`; typecheck/build pass.

- [ ] **Step 4: Commit**

```bash
git add README.MD AGENTS.md
git commit -m "Document the time speed control"
```

---

## Final Verification

- `npm run typecheck` and `npm run build` pass on the final commit.
- Manual check in `npm run dev`: the mood bar has no slider; ⏸ freezes mood, task progress, away return and the day/night window; 60×/600× accelerate all of them; after a reload the speed is back to 1× and the mood/timers continue forward without a backwards jump; the feed cooldown and task deadlines follow the accelerated clock.
- In Telegram: the control is visible in the bottom row next to «Покормить»; `MainButton` «Задачи» and `SecondaryButton` «Скины» are unaffected.
- README and AGENTS.md no longer mention the draggable mood bar or browser dev controls.
