# Tamagotchi: Time Acceleration — Design

Date: 2026-10-06
Status: Approved (user reviewed the design conversationally)

Stage 18.

## Goal

Remove the manual mood control (the draggable mood bar) and add a game-time
speed control — pause, 1×, 60×, 600× — available both in the browser and in
Telegram, so the user can study how mood changes over time. The speed affects
ALL game time: mood decay, task deadlines, away/return, feed cooldown and the
day/night cycle.

## 1. Virtual clock

- `TamagotchiState` gains `clockOffset: number` (initial 0) — game time minus
  real time. Game now = `Date.now() + clockOffset`.
- Every pure function already takes `now`; passing game now accelerates decay,
  deadlines, away/return, cooldown and `RoomScene` daylight together with no
  change to `tamagotchi.ts` logic.
- Speed is session-only: it starts at 1× on every launch. The offset IS
  persisted, so a restart never moves game time backwards.
- While speed > 1, each tick adds `realDelta × (speed − 1)` to the offset. The
  same formula freezes game now at pause (speed 0) and leaves the offset
  untouched at 1×.
- Every action that currently calls `Date.now()` (feed, start/complete/extend/
  abandon task, skin select, visibility handling, mount) uses a single
  `gameNow()` helper in `App.vue` (`Date.now() + clockOffset`) instead.
- Constants in `tamagotchi.ts`: `TIME_SPEEDS = [0, 1, 60, 600] as const`,
  `type TimeSpeed`, `DEFAULT_TIME_SPEED = 1`.

## 2. Ticking and saving

- Tick interval: 1 s while speed > 1 (a 60-s tick would skip 10 game hours at
  600×); 60 s at pause and at 1×. Pause stays exact because the offset is
  recomputed from the real delta on each tick.
- `commitTransitions` and the milestone checks run on every tick, so away
  start/return and overdue are detected promptly at high speed.
- Offset persistence is throttled: at most once per 5 s while accelerated,
  plus immediately on speed change, on visibility hidden and on unmount. An
  abrupt kill loses at most 5 real seconds of virtual time.

## 3. UI

- New `src/components/TimeControls.vue`: segmented native-chrome control
  `⏸ | 1× | 60× | 600×` (current speed highlighted) in the bottom action row
  next to `FeedButton`; Telegram theme variables only.
- `MoodIndicator.vue` becomes purely presentational: the `interactive` prop,
  `set-mood` emit, hidden range input, `aria-hidden` logic and `.range` /
  focus styles are removed.
- `App.vue` drops `handleSetMood` and the interactive wiring.
- `i18n.ts` gains `time` (Время / Time), `timePause` (Пауза / Pause) and the
  per-speed labels for accessibility.

## 4. Storage

- `storage.ts` validates/normalizes `clockOffset`: missing or non-finite → 0.
  Old saves keep loading.

## 5. README

- Remove both mentions of dragging the mood bar to preview states.
- Document the speed control, the reset to 1× on launch, `clockOffset` in the
  stored object and `TimeControls.vue` in the structure list.

## Files

- Modify: `src/tamagotchi.ts`, `src/storage.ts`, `src/i18n.ts`, `src/App.vue`,
  `src/components/MoodIndicator.vue`, `README.MD`, `api/_rules.ts`, `AGENTS.md`
- Create: `src/components/TimeControls.vue`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Manual dev-server checks: the slider is gone; pause freezes mood, task
  progress, away return and the day/night cycle; 60×/600× accelerate all of
  them; a reload resets speed to 1× while game time continues forward without
  jumping back.

## Process

- All implementation work goes through subagents (implementer + reviewer per
  task); the user is not asked to review spec or plan documents.
