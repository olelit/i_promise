# Tamagotchi: Flat Character, Fixed Layout, Room Fix — Design

Date: 2026-09-24
Status: Approved (user waived review gates)

Stage 6.

## Goal

Drop the 3D renderer entirely (no three.js, no WebGL): the character is the flat
SVG again, but with richer animations, including a pseudo-isometric turn. Fix
the layout (indicator pinned to the top, text/controls pinned to the bottom) and
stop the room window from overlapping the door.

## 1. Remove the 3D renderer

- Delete `src/components/Tamagotchi3D.vue`, `src/three/character.ts`,
  `src/webgl.ts`.
- Remove `three` and `@types/three` from `package.json`.
- `src/App.vue`: remove `defineAsyncComponent`, `isWebglAvailable`, `use3d`,
  the `Tamagotchi3D` usage and the `@unsupported` handler; the SVG `Tamagotchi`
  renders unconditionally.
- README/AGENTS: drop the 3D paragraphs and conventions; the 3D spec/plan stay
  as historical records.

## 2. Layout: indicator on top, controls at the bottom

- `MoodIndicator` moves out of the centered column and sits directly under the
  banner (browser mode) at the top of `.app`, horizontally centered.
- `main.content` becomes a column that fills the remaining height:
  `.pet-area` (flex: 1, centers the character) → `.controls` (bottom) →
  `.test-button` (browser mode) → `.task-button` (browser mode).
- `.pet-wrap` keeps `position: relative` and `margin-top: 60px` so the speech
  bubble never reaches the indicator.
- Result: the mood bar is at the very top, the away/feed panel and buttons sit
  at the bottom, the character floats in the middle.

## 3. Room fix

- The window moves further from the door: `x=20`, width `72` (right edge 92 <
  door frame left 130), with the cross bars adjusted; the rug is raised to
  `cy=540` so it sits higher on the floor, above the bottom panel.
- The room layer keeps its fixed palette and geometry but paints with
  `z-index: -1` (the app chrome has no stacking position of its own), so the
  scene stays behind the content.

## 4. Flat character animations

The SVG `Tamagotchi.vue` gains animations on top of the existing mood-driven
face, crouch and exit:

- **Idle sway/breathing**: a new `.idle` wrapper between `.exit` and `.crouch`
  with a 5s ease-in-out infinite keyframe animation
  (`rotate(-1.2deg) translateY(0)` → `rotate(1.2deg) translateY(-3px)` →
  back), `transform-origin: bottom center`. Pure 2D, safe in Telegram Desktop.
- **Pseudo-isometric turn** (front ↔ back at mood 0): the Vue `<Transition>`
  between the front and back SVGs gets a directional squash: the leaving layer
  goes to `translateX(-10px) rotate(-4deg) scaleX(0.12)`, the entering layer
  comes from `translateX(10px) rotate(4deg) scaleX(0.12)`, 0.28s each — the
  silhouette narrows and swings, reading like an isometric turn.
- **Exit/return tilt**: the away slide becomes
  `translateX(-140%) rotate(-4deg)` (and back), so leaving and returning also
  have a slight swing.

## Files

- Delete: `src/components/Tamagotchi3D.vue`, `src/three/character.ts`,
  `src/webgl.ts`
- Modify: `package.json`, `src/App.vue`, `src/components/RoomScene.vue`,
  `src/components/Tamagotchi.vue`, `README.MD`, `AGENTS.md`

## Verification

- `npm run typecheck` and `npm run build` pass; the build has a single JS chunk
  again (no 3D chunk, bundle back to ~90 kB).
- Headless (browser mode, SVG only): the indicator sits at the very top (its
  `top` is just below the banner/padding), the controls panel sits at the
  bottom (its `bottom` is above the task button), the character is vertically
  centered between them; the window's right edge is left of the door frame's
  left edge; the turn animation changes the layer transform during the
  transition (sample mid-transition).
- Manual in Telegram: no WebGL involved, animations run, layout matches.
