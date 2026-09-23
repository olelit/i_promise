# Tamagotchi: Tasks — Design

Date: 2026-09-23
Status: Approved (user waived review gates)

Stage 2 of 3 (stage 1: mood/indicator/feeding/body, stage 3: speech bubbles).

## Goal

Add tasks: create a task with hours and a short description, get a mood boost
based on the hours, track the deadline, and complete/extend/abandon it. Tasks
persist between sessions.

## Model

```ts
interface TamagotchiTask {
  description: string
  hours: number       // 1..12, as entered
  startedAt: number
  deadline: number    // startedAt + hours * 3600_000, moved by extensions
  extensions: number  // number of "+1 hour" extensions
}
```

`TamagotchiState` gains `task: TamagotchiTask | null`.

## Constants

| Constant                 | Value            |
| ------------------------ | ---------------- |
| `TASK_MIN_HOURS`         | `1`              |
| `TASK_MAX_HOURS`         | `12`             |
| `TASK_MOOD_BASE`         | `20`             |
| `TASK_MOOD_PER_HOUR`     | `10`             |
| `TASK_DESCRIPTION_MAX`   | `120`            |
| `EXTENSION_MS`           | `3600_000`       |

Decay while a task is active: `DECAY_PER_HOUR * 2 ** task.extensions` (each
extension doubles the decay rate; cumulative). After the task ends the rate
returns to normal.

## Pure functions (`src/tamagotchi.ts`)

- `startTask(state, input: { hours: number; description: string }, now)`:
  `mood = min(MOOD_MAX, max(state.mood, TASK_MOOD_BASE + TASK_MOOD_PER_HOUR * hours))`,
  sets `task = { description, hours, startedAt: now, deadline: now + hours * 3600_000, extensions: 0 }`,
  `lastSeen = now`. Assumes no active task (the UI prevents starting one).
- `completeTask(state, now)`: `task = null`, `lastSeen = now` (mood unchanged).
- `extendTask(state, now)`: `deadline += EXTENSION_MS`, `extensions += 1`,
  `lastSeen = now`.
- `abandonTask(state, now)`: `task = null`, `mood = 0`, `lastSeen = now`.
- `applyDecay(state, now)` changes:
  1. overdue check first (also while away): if `state.task && now >= state.task.deadline`
     → `{ mood: 0, task: null, lastSeen: now, awayUntil: null, lastFedAt: state.lastFedAt }`;
  2. away branch unchanged;
  3. decay uses the accelerated rate while `state.task` is active.
- Existing `feed`/`canFeed` keep `task` untouched.

## Storage

Validation accepts a missing `task` field (old saved states) and normalizes it
to `null`. When present, `task` must have a string `description`, numeric
`hours`, `startedAt`, `deadline`, and `extensions`; otherwise the whole state is
rejected as before.

## UI

### MainButton (Telegram)

- No task: text «Начать задачу», click opens the create dialog.
- Task active: text «Задача», click opens the info dialog.
- While away and no task: hidden (same as the feed button in stage 1).
- While away with an active task: «Задача» stays visible so the task can be
  completed or abandoned.

### Browser mode

The same two actions are in-page buttons at the bottom: «Начать задачу» /
«Задача».

### Create dialog (`src/components/TaskCreateDialog.vue`)

- Fields: hours (number input, `1..12`, default `1`) and description
  (single-line text input, `maxlength 120`).
- Buttons: «Начать» (disabled unless the description is non-empty after trim
  and hours is an integer in range) and «Отмена».
- Starting calls `startTask` and closes the dialog.

### Info dialog (`src/components/TaskInfoDialog.vue`)

- Shows: description, «Часов: N», remaining time
  `Осталось: <formatRemaining(deadline - now)>` (or «Просрочено», though the
  tick normally clears overdue tasks first), and «Продлений: K» when K > 0.
- Buttons: «Выполнено» (complete), «+1 час» (extend), «Отказаться»
  (two-step: first click turns the label into «Точно отказаться?», second click
  abandons; «Отмена» in the same dialog resets the confirmation), «Закрыть».
- While the away message is shown the dialog is still reachable via the
  MainButton.
- If the task disappears (completed, abandoned, overdue), the dialog closes.

### Shared modal (`src/components/Modal.vue`)

- Props: `title: string`; slot for the body. Renders a fixed overlay
  (`rgba(0,0,0,0.4)`) with a themed panel (`--tg-bg`, `--tg-text`), centered,
  max-width ~340px. Emits `close` when the overlay is clicked. Used by both
  dialogs.

## Files

- Modify: `src/tamagotchi.ts`, `src/storage.ts`, `src/App.vue`, `README.MD`
- Create: `src/components/Modal.vue`, `src/components/TaskCreateDialog.vue`,
  `src/components/TaskInfoDialog.vue`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless browser with injected state:
  - start a task → mood becomes `max(old, 20 + 10*hours)` (capped at 100);
  - decay rate doubles per extension (state with `lastSeen` hours in the past
    and `extensions: 1` decays twice as fast);
  - overdue (deadline in the past) on load → mood 0 and the task is cleared;
  - complete keeps mood, abandon sets it to 0;
  - reload keeps the task (storage round-trip).
- Manual in Telegram: MainButton switches between «Начать задачу» and «Задача»;
  the info dialog shows the countdown and all actions work.
