# Tamagotchi Stage 6: Flat Character and Layout Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove three.js/WebGL, keep the flat SVG character with richer animations (idle sway, pseudo-isometric turn, exit tilt), pin the mood bar to the top and the controls to the bottom, and stop the room window overlapping the door.

**Architecture:** the 3D files and deps are deleted and `App.vue` loses its async/WebGL logic; `.content` becomes a flex column (pet area flex:1, controls at the bottom) with the indicator moved above it; `RoomScene` moves the window; `Tamagotchi.vue` gains an `.idle` wrapper and directional flip transforms.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9 (no three.js).

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no backend/network.
- `<script setup lang="ts">`, strict TS.
- Only 2D transforms (Telegram Desktop breaks 3D transforms).
- Fixed palettes unchanged (character and room).
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Remove the 3D renderer

**Files:**
- Delete: `src/components/Tamagotchi3D.vue`, `src/three/character.ts`, `src/webgl.ts`
- Modify: `package.json`, `src/App.vue`, `README.MD`, `AGENTS.md`

**Interfaces:**
- Consumes: existing app.
- Produces: SVG-only app; no `three` dependency.

- [ ] **Step 1: Delete the files and dependencies**

```bash
git rm src/components/Tamagotchi3D.vue src/three/character.ts src/webgl.ts
npm uninstall three @types/three
```

- [ ] **Step 2: Clean `src/App.vue`**

- remove `defineAsyncComponent` from the `vue` import;
- remove `import { isWebglAvailable } from './webgl'`;
- remove the `const Tamagotchi3D = defineAsyncComponent({...})` block;
- remove `const use3d = ref(isWebglAvailable())`;
- in the template replace the 3D/SVG pair with:

```html
        <Tamagotchi :mood="current.mood" :away="away" />
```

- [ ] **Step 3: Docs**

- `README.MD`: remove the 3D paragraph and the `webgl.ts` / `three/character.ts` /
  `Tamagotchi3D.vue` structure entries; keep the flat-character description.
- `AGENTS.md`: remove the 3D convention bullet.

- [ ] **Step 4: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0; the build shows a single JS chunk
(no `Tamagotchi3D-*` chunk).

```bash
git add -A
git commit -m "Remove the 3D renderer"
```

---

### Task 2: Layout and room window

**Files:**
- Modify: `src/App.vue`, `src/components/MoodIndicator.vue`, `src/components/RoomScene.vue`

**Interfaces:**
- Consumes: `MoodIndicator`, `RoomScene`.
- Produces: indicator pinned at the top, controls at the bottom, window clear of the door.

- [ ] **Step 1: `src/App.vue` structure and styles**

Template:

```html
  <div class="app" :style="themeStyle">
    <RoomScene :away="away" />
    <div v-if="!inTelegram" class="banner">...</div>
    <MoodIndicator :mood="current.mood" />
    <main class="content">
      <div class="pet-area">
        <div class="pet-wrap">
          <SpeechBubble :message="phrase" />
          <Tamagotchi :mood="current.mood" :away="away" />
        </div>
      </div>
      <MoodControls ... />
      <button v-if="!inTelegram" class="test-button" ...>Тест анимаций</button>
      <button v-if="!inTelegram" class="task-button" ...>...</button>
    </main>
  </div>
```

Styles (replace the current `.content`/`.pet-wrap` rules):

```css
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pet-area {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-wrap {
  position: relative;
  margin-top: 60px;
}
```

- [ ] **Step 2: Center the top indicator**

In `src/components/MoodIndicator.vue` add to `.meter`:

```css
  margin: 0 auto;
```

- [ ] **Step 3: Room window clear of the door**

In `src/components/RoomScene.vue` replace the window group:

```html
      <rect x="24" y="150" width="100" height="120" rx="10" fill="#bcd8e8" stroke="#cfa87c" stroke-width="8" />
      <line x1="74" y1="150" x2="74" y2="270" stroke="#cfa87c" stroke-width="6" />
      <line x1="24" y1="210" x2="124" y2="210" stroke="#cfa87c" stroke-width="6" />
```

- [ ] **Step 4: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless: indicator `top` is at the top (below the banner/padding), controls
panel `bottom` is just above the task button, the character is centered between
them, window right edge (124 scaled) < door frame left (130 scaled).

```bash
git add src/App.vue src/components/MoodIndicator.vue src/components/RoomScene.vue
git commit -m "Pin the mood bar to the top and the controls to the bottom"
```

---

### Task 3: Flat character animations

**Files:**
- Modify: `src/components/Tamagotchi.vue`, `README.MD`

**Interfaces:**
- Consumes: `MOOD_MAX`.
- Produces: idle sway wrapper, directional flip, tilted exit.

- [ ] **Step 1: Add the `.idle` wrapper**

Template becomes:

```html
  <div class="scene">
    <div class="exit" :style="exitStyle">
      <div class="idle">
        <div class="crouch" :style="crouchStyle">
          <Transition name="flip" mode="out-in">
            ... (the two SVGs unchanged)
          </Transition>
        </div>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Styles**

```css
.exit,
.idle,
.crouch {
  width: 100%;
  height: 100%;
}

.idle {
  transform-origin: bottom center;
  animation: idle-sway 5s ease-in-out infinite;
}

@keyframes idle-sway {
  0%,
  100% {
    transform: rotate(-1.2deg) translateY(0);
  }
  50% {
    transform: rotate(1.2deg) translateY(-3px);
  }
}

.flip-enter-active,
.flip-leave-active {
  transition: transform 0.28s ease;
}

.flip-enter-from {
  transform: translateX(10px) rotate(4deg) scaleX(0.12);
}

.flip-leave-to {
  transform: translateX(-10px) rotate(-4deg) scaleX(0.12);
}
```

(remove the previous `.flip-enter-from`/`.flip-leave-to` scaleX-only rules)

- [ ] **Step 3: Tilted exit**

```ts
const exitStyle = computed(() => ({
  transform: props.away ? 'translateX(-140%) rotate(-4deg)' : 'translateX(0) rotate(0deg)',
}))
```

- [ ] **Step 4: README**

Mention the flat character animations: idle sway, pseudo-isometric turn, tilted
exit.

- [ ] **Step 5: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless: mid-turn (transition running) the layer's transform includes
`scaleX(0.12)`; an away state gives the exit wrapper a `rotate(-4deg)` matrix;
idle: two screenshots ~1s apart differ.

```bash
git add src/components/Tamagotchi.vue README.MD
git commit -m "Add flat character idle and isometric-style animations"
```
