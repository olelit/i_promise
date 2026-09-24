# Tamagotchi: Room Background, Top Indicator, Away Task, Test Animations — Design

Date: 2026-09-24
Status: Approved (user waived review gates)

Stage 5.

## Goal

Five changes: allow starting a task while the character is away (starting it
brings the character back), move the mood indicator to the top as a horizontal
bar, add a browser-only "test animations" button, add a full-screen room
background whose door closes when the character leaves, and give the character
bear-like ears.

## 1. Task while away

- The task button (MainButton in Telegram, in-page in browser mode) is always
  visible: «Начать задачу» with no task, «Задача» with an active one. The old
  rule that hid it while away with no task is removed.
- `startTask(state, input, now)` clears `awayUntil` so starting a task calls the
  character back immediately (mood rises to the task level, which is always
  above `MOOD_MIN`).
- The away countdown message stays visible while the character is away; the
  task button sits next to it.

## 2. Horizontal mood indicator at the top

- `MoodIndicator.vue` becomes horizontal: a rounded track `width: 100%`,
  `max-width: 300px`, `height: 14px`, filled from the left with
  `width: fraction * 100%`. Same fill fraction `(mood + 100) / 200` and same
  HSL color mapping; same `role="meter"` attributes; same 0.6s transitions.
- Layout: the indicator moves from beside the character to the top of
  `.content` (indicator → character row → controls). The character container
  reserves ~60px above itself (`.pet-wrap { margin-top: 60px; }`) so the speech
  bubble never covers the indicator.

## 3. Test animations button (browser mode only)

- A small secondary button «Тест анимаций» under the controls, rendered only
  when `!inTelegram`.
- Each press applies the next state in a fixed cycle and persists it:
  `100` → `50` → `0` → `-50` → away (`mood = -100`, `awayUntil = now + 2h`) →
  back to `100`. `lastSeen` is refreshed on each press.
- The cycle exists to preview every animation without waiting for real decay;
  it changes the real state (documented in the button title attribute).

## 4. Full-screen room background with an animated door

- New component `src/components/RoomScene.vue`, props `{ away: boolean }`:
  a fixed full-viewport SVG layer behind the app content
  (`position: fixed; inset: 0; z-index: 0; pointer-events: none`;
  `preserveAspectRatio="xMidYMid slice"`).
- Fixed cozy palette (independent of the Telegram theme): wall `#f3e9dc`,
  floor `#e2c49c`, floor edge `#cfa87c`, door frame `#8c5a3b`, opening
  `#5c4033`, door leaf `#b07b52`, handle `#f4d35e`, window `#bcd8e8`,
  rug `#cfe6d4`.
- The door sits centered on the back wall, directly behind the character. The
  leaf is hinged on its left edge: open = `scaleX(0.18)`, closed = `scaleX(1)`,
  with a 0.9s transition. When `away` is true the door closes.
- 2D transforms only (the earlier Telegram Desktop 3D-transform bug makes
  `preserve-3d` unsafe).
- `App.vue` renders `<RoomScene :away="away" />` as the first child of `.app`;
  `.app` loses its opaque background (the room covers the viewport) and its
  content gets `position: relative; z-index: 1`. `.controls` gains a rounded
  `var(--tg-secondary-bg)` panel so the hint text stays readable over the room
  in both themes.
- Generated-image backgrounds are a later option: the recommended workflow is
  two images with the same seed (door open / door closed) crossfaded on `away`;
  the procedural room is the current implementation.

## 5. Bear ears

- 3D model: replace the small icosahedron ears with larger rounded bear ears —
  outer `SphereGeometry(0.24, 10, 8)` scaled `(1, 1, 0.6)` at
  `(±0.36, 1.16, 0)`, plus an inner ear `SphereGeometry(0.13, 8, 6)` in the
  belly color at `(±0.36, 1.16, 0.12)`.
- SVG fallback: ears grow from `r=13` to `r=17` at `(±30, 56)` relative to the
  head center, with inner circles `r=8` in `#a8dcc0` for parity.

## Files

- Modify: `src/tamagotchi.ts` (startTask clears `awayUntil`), `src/App.vue`
  (layout, room layer, test button, always-visible task button),
  `src/components/MoodIndicator.vue`, `src/three/character.ts`,
  `src/components/Tamagotchi.vue`, `README.MD`
- Create: `src/components/RoomScene.vue`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless: indicator horizontal at the top (fill grows left→right at moods
  100/0/-50); task button visible while away; starting a task while away clears
  the away state (character returns, mood = task level); the test button cycles
  through the five states; the room renders behind the character and the door
  leaf's transform changes when away; bear ears visible in the 3D screenshots.
- Manual in Telegram: the room and top bar look right, the task button is
  available while the pet is away.
