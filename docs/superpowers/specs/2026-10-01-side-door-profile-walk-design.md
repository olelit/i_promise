# Tamagotchi: Side Door, Profile Walk, Round Window — Design

Date: 2026-10-01
Status: Draft (pending user review)

Stage 11.

## Goal

Move the door to the right edge of the room, animate the character walking to
it in profile (with turns at both ends), and replace the rectangular window
with a round porthole. The rug and the character's home stay centered.

## 1. Room geometry

- Door frame `x=204..388` (`DOOR_FRAME = { x: 204, y: 180, width: 184,
  height: 300 }`), opening `216..376` (`DOOR_OPENING = { x: 216, y: 192,
  width: 160, height: 288 }`), center `x=296`. Vertical geometry is unchanged.
- The tree moves with the door: `TREE_POS = { x: 340, y: 320 }` (the same
  offset inside the opening as before).
- The knob moves to `KNOB = { x: 356, y: 340, width: 8, height: 8 }`.
- The grass strip stays derived from `DOOR_OPENING`.
- The rug (`RUG = { x: 60, y: 524, width: 280, height: 72 }`) and the
  character's home (`x=200`) are unchanged.

## 2. Round window

- Replace `WINDOW_FRAME`, `WINDOW_PANE`, `WINDOW_BAR_V`, `WINDOW_BAR_H` with
  `WINDOW = { x: 16, y: 170, width: 80, height: 80 }` and `WINDOW_MAP`: a 40×40
  pixel map drawn as `fillEllipse(20, 20, 20, 20, 'D')` (dark rim),
  `fillEllipse(20, 20, 18, 18, 'B')` (beige frame) and
  `fillEllipse(20, 20, 16, 16, 'K')` (sky).
- `SUN_MAP` becomes a 16×16 `'S'` circle at `SUN_POS = { x: 40, y: 194 }`;
  `MOON_MAP` becomes a 14×14 `'M'` circle with craters at
  `MOON_POS = { x: 42, y: 196 }`. Both fit inside the sky disc, so the window
  `clipPath` is removed; day/night crossfade stays.

## 3. Profile sprites

- `canvas.ts` gains `mirrorX(canvas: string[][]): string[][]`.
- `character.ts` gains `profileWalkMap(frame: 0 | 1, facing: 1 | -1): PixelMap`
  — a 48×48 profile facing right (head, one near ear, eye, dark nose pixel,
  belly, tail, alternating legs), mirrored for `facing = -1`.
- Turn phases are crossfades (150 ms) between the back sprite and the profile
  sprite, like the existing mood-state crossfade.

## 4. Walk path and timings

- Horizontal distance: 96 units (`x=200 → 296`); vertical: 80 units
  (`y=560 → 480`).
- Timing constants in `character.ts`: `TURN_MS = 150`, `WALK_H_MS = 600`,
  `WALK_V_MS = 400`, `LEAVE_MS = TURN_MS + WALK_H_MS + TURN_MS + WALK_V_MS =
  1300`. `WALK_FRAME_MS = 150` stays. `WALK_MS` is removed; `App.vue` and
  `RoomScene.vue` import `LEAVE_MS` instead.
- Leaving (`away` true, animated):
  1. `0..150` turn: profile stand, no movement.
  2. `150..750` walk-h: profile walk frames, X `0 → +96` in `steps(3)`.
  3. `750..900` turn: back stand.
  4. `900..1300` walk-v: back walk frames, Y `0 → −80` in `steps(2)`.
  5. `1300`: character hidden; `RoomScene` starts closing the door
     (delay `LEAVE_MS`, three frames at `DOOR_STEP_MS`).
- Returning (`away` false, character hidden):
  1. `0..300` the door opens (`DOOR_OPEN_MS`), character stays hidden.
  2. `300..700` walk-v-in: back walk frames, Y back to 0 in `steps(2)`.
  3. `700..850` turn: profile stand.
  4. `850..1450` walk-h-in: profile walk facing left, X back to 0 in
     `steps(3)`.
  5. `1450`: idle mood sprite.
- Two wrappers around the sprite: `.move-x` (translateX, 0.6 s `steps(3)`) and
  `.move-y` (translateY, 0.4 s `steps(2)`). Phase delays live in CSS custom
  properties bound from the timing constants so the CSS and the phase machine
  cannot drift apart.
- Offsets: on tall screens X uses `calc(96 / 700 * 100vh)` and Y
  `calc(-80 / 700 * 100vh)`; the existing `min-aspect-ratio: 4/7` query keeps
  Y at `-22.5vw` and adds X `24vw`.
- Cold load while away (`animate === false`): position and hidden state snap,
  no phases.
- Interruptions: every `away` change clears the phase timers; a character
  interrupted mid-leave returns to the rug without getting stuck (both axes
  transition back over ~0.4 s), then shows its mood sprite.
- The speech bubble hides after `LEAVE_MS` (instead of `WALK_MS`).

## Files

- Modify: `src/pixel/canvas.ts`, `src/pixel/character.ts`, `src/pixel/room.ts`,
  `src/components/Tamagotchi.vue`, `src/components/RoomScene.vue`,
  `src/App.vue`, `README.MD`
- No new dependencies, no binary assets; `src/tamagotchi.ts` untouched.

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless screenshots: idle (door at the right edge, round porthole, rug
  centered), away (closed door, no character, no bubble), return (character
  back on the rug).
- Manual: the character turns to profile, walks right to the door, turns back,
  enters, and the door closes; on return the sequence plays in reverse; rapid
  slider toggles do not leave the character stuck or hidden.
