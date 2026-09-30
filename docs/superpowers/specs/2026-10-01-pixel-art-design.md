# Tamagotchi: Pixel Art Overhaul — Design

Date: 2026-10-01
Status: Approved

Stage 10.

## Goal

Redraw the whole game in pixel art — room, character, mood bar — with no
external asset service and no binary files: pixel maps live in TypeScript and
render to SVG with `shape-rendering: crispEdges`. Fix the rug overlapping the
door by moving the rug and the character deeper into the room, and add a walk
cycle to the door. Make the mood bar taller and give it a stepped pixel frame.

## 1. Pixel grid and rendering

- Room: the viewBox stays `400×700`, but the virtual pixel is `2×2` units, so
  the art grid is `200×350`. All room geometry snaps to even coordinates.
- Character: a `48×48` sprite grid rendered into the existing `240×240`
  element (exactly `5×`).
- The character's pixel (5 px) is intentionally coarser than the room's
  (~2–3 px on screen): the pet reads better that way. If a single density is
  wanted later, the room grid can be coarsened.
- `PixelSprite.vue` takes a pixel map (`string[]` plus a palette) and renders
  one `<rect>` per horizontal run of equal pixels, with
  `shape-rendering: crispEdges`. Room props are composed from snapped
  primitives and a few small maps (tree, sun, moon, rug).
- Pixel maps are validated in dev: ragged rows or unknown palette characters
  throw at render time.

## 2. Palette

- New `src/pixel/palette.ts` — one fixed palette shared by room, character,
  rug and mood bar, reusing the current colors, e.g. wall `#f3e9dc`, floor
  `#e2c49c`, baseboard `#cfa87c`, door frame `#8c5a3b`, door leaf `#b07b52`,
  knob/sun `#f4d35e`, outside sky `#9ec9e2`, grass `#8fbf7f`, tree `#6da85f`,
  trunk `#7a5a3a`, window sky `#bcd8e8`, moon `#e8eef7`, crater `#cbd6e6`, rug
  `#cfe6d4`, pet `#7ec8a9`, pet light `#a8dcc0`, blush `#f4a3a3`, dark
  `#2f4f43`, plus mood colors red `#d9534f`, yellow `#f4d35e`, green `#6da85f`
  and frame brown `#5a3a26`.
- Night dimming stays an overlay rect (`#0b1a33`, opacity
  `0.45 * (1 - daylight)`) — a tint, not a palette color.

## 3. Room scene

- Wall, floor, baseboard, window (with sun/moon crossfade), door frame,
  doorway and yard (sky, grass, tree) keep their composition but are redrawn on
  the `2×2` grid.
- Rug: chunky pixel ellipse, center `(200, 560)`, `rx=140`, `ry=36`, spans
  `y=524..596`. The door threshold is at `y=480`, so the rug clears it by
  ~44 units (22 virtual pixels).
- Character stands on the rug: `.pet-wrap` bottom moves from `32.5vh` to
  `~20vh`; the wide-screen query becomes `calc(50vh - 52.5vw + 2px)`;
  `.bubble-anchor` keeps its `+250px` offset.
- Door closing: the front leaf is drawn from primitives (no huge map); the
  closing animation uses 3 discrete frames (leaf at ~33 %, ~66 %, 100 % width)
  with a pixel-stepped edge, then the closed leaf.
- Exit: mood reaches −100 → the character walks from the rug to the doorway in
  2–3 discrete steps (two walk frames), without shrinking; the front door leaf
  covers it as it closes (the front layer already sits above the content).
- Return: the door opens, the character walks back from the doorway to the rug,
  the same walk frames reversed.
- Walk and door phases last ~0.6–0.9 s and interrupt cleanly when the state
  changes (no stuck phases).

## 4. Character sprites

- Discrete `48×48` sprites, one per mood band:
  - front, mood > 0: happy (67…100), neutral (33…67), sad (1…33);
  - back, mood ≤ 0: standing (0…−33), hunched (−33…−66), crouched
    (−66…−100).
- Idle breathing: a second frame per pose, derived by shifting the whole map
  down one row (the bottom row becomes empty); frames swap with `steps()`
  timing, so the motion stays on the pixel grid.
- Walk: two back-view walk maps (legs swapped), reused for exit and return.
- Away (mood ≤ −100) keeps the existing `awayUntil` logic.
- Mood state changes crossfade over ~150 ms. The mood slider switches the six
  states discretely (accepted trade-off of the pixel look).

## 5. Mood bar

- Height grows from `14px` to `22px`: a 4 px pixel frame top and bottom around
  a 14 px interior.
- Frame: stepped pixel outline in the fixed game palette (dark brown outline,
  light bevel, dark track), fixed colors — no Telegram theme variables.
- Fill: 20 segments of 5 %; the lit width snaps to
  `round(fraction * 20) / 20`. Each segment is colored by its position: red
  below 0, yellow from 0 through 50, green above 50 — matching the README
  (green at 100, yellow at 50, red at 0 and below). Unfilled segments show the
  dark track.
- The invisible range input stays on top: dragging, keyboard access and the
  focus outline are unchanged.

## 6. Telegram-themed chrome vs game palette

- Speech bubble: stepped pixel frame and tail in the game palette; the text
  stays in the system font (a pixel font would be a separate asset, out of
  scope).
- Feed button, task dialogs, browser banner and the Telegram MainButton stay
  themed (MainButton is native and cannot be restyled).
- `AGENTS.md` is updated: the room, character, mood bar and speech bubble use
  the fixed game palette from `src/pixel/palette.ts`; native controls and
  dialogs keep the Telegram theme variables.

## Files

- New: `src/pixel/palette.ts`, `src/pixel/character.ts`, `src/pixel/room.ts`,
  `src/components/PixelSprite.vue`
- Modify: `src/components/RoomScene.vue`, `src/components/Tamagotchi.vue`,
  `src/components/MoodIndicator.vue`, `src/components/SpeechBubble.vue`,
  `src/App.vue`, `AGENTS.md`, `README.MD`
- No new dependencies, no network calls, no binary assets. Game logic in
  `src/tamagotchi.ts` is untouched.

## Verification

- `npm run typecheck` and `npm run build` pass.
- Pixel maps validate: every row has the same length, every character is in
  the palette.
- Manual on `npm run dev` (browser mode): the room and character are visibly
  pixelated with crisp edges; the rug does not touch the door; the character
  stands on the rug; the mood slider steps through the six sprites; at −100 the
  character walks to the door, the door closes in steps, and on return it walks
  back; the window still switches sun/moon and the room still dims at night;
  the mood bar is taller, framed and segmented.
- Manual in Telegram: the same, plus themed dialogs and MainButton unchanged.
