# Tamagotchi: Task Stats, Progress and UI Consolidation — Design

Date: 2026-10-01
Status: Approved (user reviewed the design conversationally)

Stage 17.

## Goal

Add task history and an on-screen current-task progress bar, make the pet an
observer (it never offers to do the work), enlarge the window and move the
sun/moon into a corner, move the feed button into the bottom action row, and
rename the main action to «Задачи» opening a dialog with the current task,
history and a «Новая задача» button.

## 1. State

- `TaskRecord = { description: string; hours: number; startedAt: number;
  finishedAt: number; status: 'done' | 'abandoned' | 'overdue' }`.
- `TamagotchiState` gains `history: TaskRecord[]`, newest first, capped at
  `HISTORY_MAX = 20`.
- Appends: `completeTask` (`done`, `finishedAt = now`), `abandonTask`
  (`abandoned`, `now`), the overdue transition inside `applyDecay` (`overdue`,
  `finishedAt = deadline`).
- **At most one active task**: `startTask` refuses to replace an active task
  (returns the state unchanged) and the «Новая задача» button is disabled
  while a task is running, so a new task can only be started when the current
  one is done, abandoned or overdue.
- Every literal state return carries `history`; `storage.ts` accepts a missing
  or malformed history and normalizes it to a valid capped array.
- `taskTiming(task, now): { elapsed, total, remaining, overdue }` is a pure
  helper; `TASK_MILESTONE_FRACTION = [0.5, 0.25]` and
  `TASK_MILESTONE_SOON_MS = 600_000` drive the pet's comments.

## 2. UI

- `TaskProgress.vue`: a thin pixel bar (frame/bevel/track like the mood bar)
  with the label «1 ч 20 мин из 3 ч» («Просрочено на …» after the deadline);
  blue fill, red when overdue; hidden when there is no task. On the main
  screen it is wrapped in a button that opens the tasks dialog.
- `TasksDialog.vue` (replaces `TaskInfoDialog.vue`): the current task
  (description, progress, «Выполнено» / «+1 час» / «Отказаться» with confirm),
  a «Новая задача» button (disabled while a task is active; closes the dialog
  and opens `TaskCreateDialog`), and the history list (status, plan, actual
  duration, date) with an empty state.
- `FeedButton.vue`: the feed button and its logic (label, cooldown/full
  disabled state, haptics, blocked phrase) moved out of `MoodControls.vue`.
- The bottom action row is always rendered: browser — «Задачи», «Скины»,
  «Покормить»; Telegram — `MainButton` «Задачи», `SecondaryButton` «Скины»,
  and the in-app row holds «Покормить» (plus «Скины» on clients without the
  secondary button). `MoodControls.vue` keeps only the away message.
- `i18n.ts` gains the tasks/history/status strings, `formatDuration(ms)` and
  `formatDateTime(ts)`.

## 3. Phrases (observer)

- The pet only watches and comments; it never volunteers to do the work.
  All task phrases are rewritten (ru/en).
- New events `taskHalf`, `taskQuarter`, `taskTenMinutes`. The app announces a
  threshold when the remaining time crosses it downward, on tick and on
  visibility change; thresholds already passed when the app opens are marked
  seen without announcing, and an extension re-arms them once the remaining
  time rises above the threshold again.

## 4. Window

- `WINDOW = { x: 16, y: 150, width: 96, height: 128 }` with a 48×64 pixel map
  (dark rim, beige frame, sky, cross bars). The sun (16 px) and moon (14 px)
  sit in the upper-left pane corner instead of the centre.

## 5. Process

- All implementation work goes through subagents (implementer + reviewer per
  task); the user is not asked to review spec or plan documents.

## Files

- Modify: `src/tamagotchi.ts`, `src/storage.ts`, `src/phrases.ts`,
  `src/i18n.ts`, `src/App.vue`, `src/components/MoodControls.vue`,
  `src/pixel/room.ts`, `README.MD`, `AGENTS.md`
- Create: `src/components/TaskProgress.vue`, `src/components/FeedButton.vue`,
  `src/components/TasksDialog.vue`
- Delete: `src/components/TaskInfoDialog.vue`

## Verification

- `npm run typecheck` and `npm run build` pass.
- A local script checks history appends, the cap, old-save normalization and
  the timing helper.
- Screenshots: the progress bar with a task, the tasks dialog with history,
  the feed button in the row, the rectangular window.
