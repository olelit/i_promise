# Tamagotchi: 3D Character — Design

Date: 2026-09-23
Status: Approved (user waived review gates)

Stage 4 (after mood/indicator/feeding/body, tasks, and speech bubbles).

## Goal

Render the tamagotchi as a real low-poly 3D figure on a WebGL canvas, built
procedurally in code (no art assets), with a calm idle animation: gentle sway
and occasional small turns. All existing state-driven behavior is preserved:
face sadder as mood falls, turn the back at mood ≤ 0, crouch below 0, leave the
screen at −100 and come back. When WebGL is unavailable (some Telegram Desktop
builds) the current SVG character is used automatically.

## Dependency

- `three` (runtime) — WebGL renderer and primitives. It ships its own TypeScript
  types; if the installed version lacks them, add `@types/three` as a dev
  dependency. The 3D component is loaded lazily (`defineAsyncComponent`), so the
  three.js chunk is only fetched when WebGL is actually available; the SVG
  fallback path keeps the current bundle size.

## Architecture

- `src/webgl.ts`: `isWebglAvailable(): boolean` — creates a `webgl2` context on a
  throwaway canvas (three r186 requires WebGL2), releases it via
  `WEBGL_lose_context`, guarded by try/catch.
- `src/three/character.ts`: `createCharacter(): Character` — builds the model
  from primitives and returns the group plus references to the animated parts
  (mouth, eyes, brows, blush materials, back details). Pure three.js code, no
  Vue.
- `src/components/Tamagotchi3D.vue`: props `{ mood: number; away: boolean }`,
  emits `unsupported`. Owns the renderer, camera, lights, animation loop and
  disposal; maps props to the model each frame.
- `src/App.vue`: renders `Tamagotchi3D` (async) when `isWebglAvailable()`,
  otherwise the existing `Tamagotchi.vue`; an `unsupported` event from the 3D
  component switches to the SVG for the rest of the session.

## Model (procedural low-poly)

Same palette as the SVG character. Flat-shaded materials
(`MeshStandardMaterial({ flatShading: true })`), hemisphere + directional
light, transparent renderer background so the Telegram theme shows through.

| Part   | Geometry                                            | Color     |
| ------ | --------------------------------------------------- | --------- |
| head   | `IcosahedronGeometry(0.55, 1)`                      | `#7ec8a9` |
| ears   | two `IcosahedronGeometry(0.18, 0)`                  | `#7ec8a9` |
| torso  | `IcosahedronGeometry(0.62, 1)` scaled (1, 1.15, 0.9)| `#7ec8a9` |
| belly  | `SphereGeometry(0.42, 10, 8)` scaled (0.9, 1, 0.6)  | `#a8dcc0` |
| arms   | two `CapsuleGeometry(0.12, 0.42, 4, 8)`             | `#7ec8a9` |
| feet   | two `CapsuleGeometry(0.14, 0.2, 4, 8)`              | `#7ec8a9` |
| eyes   | two `SphereGeometry(0.12, 8, 8)` + pupils (0.05)    | `#ffffff` / `#2f4f43` |
| brows  | two `BoxGeometry(0.22, 0.05, 0.05)`                 | `#2f4f43` |
| mouth  | `TorusGeometry(0.16, 0.035, 8, 12, Math.PI)`        | `#2f4f43` |
| blush  | two `SphereGeometry(0.09, 8, 6)` (transparent)      | `#f4a3a3` |
| curl   | `TorusGeometry(0.12, 0.03, 6, 10, Math.PI * 1.2)`   | `#5da88b` |
| tail   | `SphereGeometry(0.12, 8, 6)` scaled (1, 0.7, 0.5)   | `#a8dcc0` |

The mouth is a half-torus in the XY plane: `rotation.z = Math.PI` reads as a
smile, `0` as a frown, so mood can morph it continuously.

## Camera, lights, canvas

- `PerspectiveCamera(40, 1, 0.1, 100)` at `(0, 0.2, 4.2)`, looking at
  `(0, 0.05, 0)`.
- `HemisphereLight(0xffffff, 0x444444, 1.1)` + `DirectionalLight(0xffffff, 1.2)`
  at `(2, 3, 4)`.
- `WebGLRenderer({ canvas, antialias: true, alpha: true })`,
  `setPixelRatio(min(devicePixelRatio, 2))`, `setSize(200, 200, false)`,
  transparent clear color. The canvas is 200×200 CSS pixels, like the SVG scene.

## State mapping (per frame, smoothed)

- `t = clamp(mood / 100, 0, 1)`:
  - mouth `rotation.z = Math.PI * t`;
  - eye `scale.y = 1 - (1 - t) * 0.35`;
  - brows `rotation.z = ±(1 - t) * 0.35`;
  - blush material `opacity = t` (hidden below 0.05).
- `turned = mood <= 0` → base yaw `π`, else `0`, eased toward the target.
- `crouch = mood < 0 ? -mood / 100 : 0` → `scale.y = 1 - crouch * 0.15`,
  `position.y = -crouch * 0.12`.
- `away` → base x `-3.5`, else `0`, eased; the canvas clips the character as it
  slides out.

## Idle animation

- Sway: `rotation.z = sin(time * 0.9) * 0.04` added to the base rotation.
- Breathing: `scale.y *= 1 + sin(time * 1.4) * 0.01`.
- Occasional turn: every 5–9 s pick a small yaw offset in `±0.25` rad, ease
  toward it, hold ~2–4 s, ease back to 0. The offset is added to the base yaw
  (front or turned).
- All eased with exponential smoothing (`value += (target - value) * min(1, dt * speed)`)
  so prop changes and idle motion never snap.

## Loop, lifecycle, performance

- `requestAnimationFrame` loop capped at ~30 fps (`render only if
  time - last >= 33ms`); `Clock`/`performance.now()` deltas for smoothing.
- Pause on `document.visibilitychange` hidden, resume on visible.
- On unmount: cancel the loop, remove the listener, dispose all geometries and
  materials, `renderer.dispose()`.
- Any init failure (no WebGL context, renderer constructor throwing) is caught
  and reported with `emit('unsupported')`; the app then renders the SVG
  character.

## Files

- Modify: `package.json` (add `three`), `src/App.vue`, `README.MD`, `AGENTS.md`
  (note the lazy 3D dependency)
- Create: `src/webgl.ts`, `src/three/character.ts`,
  `src/components/Tamagotchi3D.vue`

## Verification

- `npm run typecheck` and `npm run build` pass; the build emits a separate chunk
  for the 3D component.
- Headless Chrome with software WebGL (SwiftShader): the canvas renders the
  character; screenshots at moods `100`, `0`, `-50` show the smiling face, the
  back, and the crouched back; an away state slides it out; a short screen
  recording or two consecutive screenshots show the idle sway.
- With WebGL forced off (e.g. `--disable-webgl`), the SVG character renders
  instead and no console errors appear.
- Manual in Telegram Desktop: the 3D figure renders and animates; if that
  build lacks WebGL, the SVG appears automatically.
