# Tamagotchi: Doorway Alignment and Exit Behind the Door — Design

Date: 2026-09-24
Status: Approved (user waived review gates)

Stage 8.

## Goal

Remove the hint text, align the character with the doorway (centered and
standing on the room floor), and change the exit so the character walks INTO
the doorway and the door closes in front of it.

## 1. Remove the hint

`MoodControls.vue`: drop the «Настроение падает само…» paragraph and its style.
The panel keeps the feed button (or the away message while away).

## 2. Character aligned with the doorway

- The room floor sits at `470 / 700 = 67.1%` of the viewport height on portrait
  screens (with `xMidYMid slice` and `scale = H / 700`, there is no vertical
  crop).
- Anchor the character to that line: `.pet-wrap` becomes
  `position: fixed; left: 50%; bottom: 32.5vh; transform: translateX(-50%)`.
  The feet then land on the floor line and the character is horizontally
  centered with the door (the room crops symmetrically).
- The doorway grows so the character fits inside it: the frame spans
  `y = 180..480`, the opening `y = 192..480` (288 units tall vs the 240px
  character).
- The room's back layer no longer draws the door leaf (the front layer owns it,
  section 3); it keeps the wall, floor, window, frame, dark opening and rug.

## 3. Exit into the doorway, door closes in front

- `RoomScene.vue` gains a `front?: boolean` prop. Rendered with `front`, it
  draws only the door leaf in the same viewBox/`preserveAspectRatio`, so it
  aligns pixel-perfectly with the back layer; the layer is fixed,
  `pointer-events: none`, `z-index: 2` (above the app content).
- Front leaf behaviour:
  - present (open): `opacity: 0` (invisible, the dark opening shows);
  - away: `transform: scaleX(1)` and `opacity: 1` both start at 0.7s
    (`transform 0.5s ease 0.7s`, `opacity 0.15s linear 0.7s`) — the leaf fades in
    as it starts swinging, so no hinge sliver shows during the delay and the
    door closes after the character has entered.
- `Tamagotchi.vue` exit animation: instead of sliding off-screen, the character
  shrinks into the doorway: `translateY(-26px) scale(0.32)` with
  `transform-origin: bottom center` (shrinks toward its feet, i.e. into the
  depth), 0.8s.
  - leaving: `transition: transform 0.8s ease` (immediate);
  - returning: `transition: transform 0.8s ease 0.45s` (waits until the door is
    gone), implemented with an `.away` class on the exit wrapper.
- Result: the character shrinks into the opening, the front leaf closes over
  it, and on return the leaf disappears first and the character grows back.

## Files

- Modify: `src/components/MoodControls.vue`, `src/App.vue`,
  `src/components/RoomScene.vue`, `src/components/Tamagotchi.vue`, `README.MD`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless: no `.hint` element; the character's feet rect bottom matches the
  floor line within a few pixels (compute the floor's screen y from the SVG
  viewBox and compare with `.scene`'s bottom); on an away state the front leaf
  becomes visible (`opacity: 1`) and its transform reaches `scaleX(1)` after
  the delay, while the character's transform includes `scale(0.32)`; on return
  the leaf is hidden and the character's transform returns to identity after
  the delay. Screenshots: present, mid-exit, closed door.
- Manual in Telegram: the character stands in the doorway; leaving looks like
  walking through the door.
