# Tamagotchi Stage 5: Room, Top Indicator, Away Task, Test Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Start tasks while the pet is away (and bring it back), move the mood indicator to a horizontal bar at the top, add a browser-only test-animations button, add a full-screen room background whose door closes when the pet leaves, and give the character bear ears.

**Architecture:** `startTask` clears `awayUntil`; the MainButton loses its away-hiding rule; the indicator becomes horizontal and moves above the character; `RoomScene.vue` is a fixed SVG layer behind the app with a 2D-transform door; ears change in both the 3D model and the SVG fallback.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, three.js 0.186.

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no backend/network.
- `<script setup lang="ts">`, strict TS.
- Room palette is fixed: wall `#f3e9dc`, floor `#e2c49c`, floor edge `#cfa87c`, frame `#8c5a3b`, opening `#5c4033`, leaf `#b07b52`, handle `#f4d35e`, window `#bcd8e8`, rug `#cfe6d4`. Character palette unchanged.
- Only 2D transforms for the door (3D transforms are unreliable in Telegram Desktop).
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Task while away + test animations button

**Files:**
- Modify: `src/tamagotchi.ts`, `src/App.vue`, `README.MD`

**Interfaces:**
- Consumes: existing app.
- Produces: `startTask` clears `awayUntil`; MainButton always visible; `handleTestAnimation` cycle.

- [ ] **Step 1: `startTask` clears the away state**

In `src/tamagotchi.ts`, the returned object gains `awayUntil: null`:

```ts
  return {
    mood,
    lastSeen: now,
    awayUntil: null,
    lastFedAt: state.lastFedAt,
    task: {
      description: input.description.trim(),
      hours,
      startedAt: now,
      deadline: now + hours * HOUR_MS,
      extensions: 0,
    },
  }
```

- [ ] **Step 2: MainButton always visible**

In `src/App.vue`, remove the `showTaskButton` computed and replace the
MainButton `watchEffect` body with:

```ts
watchEffect(() => {
  if (!webApp) {
    return
  }
  webApp.MainButton.setText(task.value === null ? 'Начать задачу' : 'Задача')
  webApp.MainButton.show()
})
```

The browser-mode task button loses its condition and becomes
`v-if="!inTelegram"`.

- [ ] **Step 3: Test animations button**

Add to `src/App.vue` (import `AWAY_DURATION_MS`, `MOOD_MIN` from `./tamagotchi`):

```ts
const TEST_MOODS = [100, 50, 0, -50] as const
const testStep = ref(0)

function handleTestAnimation(): void {
  now.value = Date.now()
  const step = testStep.value % (TEST_MOODS.length + 1)
  testStep.value = step + 1
  if (step === TEST_MOODS.length) {
    state.value = {
      ...state.value,
      mood: MOOD_MIN,
      lastSeen: now.value,
      awayUntil: now.value + AWAY_DURATION_MS,
    }
  } else {
    state.value = {
      ...state.value,
      mood: TEST_MOODS[step],
      lastSeen: now.value,
      awayUntil: null,
    }
  }
  void saveState(state.value)
}
```

Template, after `MoodControls`:

```html
      <button
        v-if="!inTelegram"
        class="test-button"
        type="button"
        title="Переключает состояния: 100 → 50 → 0 → −50 → уход"
        @click="handleTestAnimation"
      >
        Тест анимаций
      </button>
```

Style:

```css
.test-button {
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: var(--tg-secondary-bg);
  color: var(--tg-hint);
  font-size: 13px;
  cursor: pointer;
}
```

- [ ] **Step 4: README**

Add a line to the mechanics section: while the pet is away, starting a task
calls it back; the browser mode has a «Тест анимаций» button cycling through
100 → 50 → 0 → −50 → уход.

- [ ] **Step 5: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.

```bash
git add src/tamagotchi.ts src/App.vue README.MD
git commit -m "Allow tasks while away and add animation test button"
```

---

### Task 2: Horizontal top indicator

**Files:**
- Modify: `src/components/MoodIndicator.vue`, `src/App.vue`

**Interfaces:**
- Consumes: `MOOD_MAX`, `MOOD_MIN`.
- Produces: horizontal `MoodIndicator`; layout indicator → character → controls.

- [ ] **Step 1: `MoodIndicator.vue` becomes horizontal**

Replace the styles and the fill binding:

```ts
const fillStyle = computed(() => ({
  width: `${fraction.value * 100}%`,
  background: `hsl(${hue.value}, 70%, 45%)`,
}))
```

```css
.meter {
  width: 100%;
  max-width: 300px;
  height: 14px;
  border-radius: 7px;
  background: var(--tg-secondary-bg);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.6s ease, background 0.6s ease;
}
```

(The template keeps `role="meter"` and the aria attributes; the fill `div`
stays a single child.)

- [ ] **Step 2: Layout**

In `src/App.vue`, `.content` becomes:

```html
    <main class="content">
      <MoodIndicator :mood="current.mood" />
      <div class="pet-wrap">
        <SpeechBubble :message="phrase" />
        <Tamagotchi3D v-if="use3d" :mood="current.mood" :away="away" @unsupported="use3d = false" />
        <Tamagotchi v-else :mood="current.mood" :away="away" />
      </div>
      <MoodControls :remaining-ms="remainingMs" :next-feed-ms="nextFeedMs" :block-reason="feedBlock" @feed="handleFeed" @feed-blocked="handleFeedBlocked" />
      <button v-if="!inTelegram" class="test-button" ...>Тест анимаций</button>
    </main>
```

Remove the `.pet-row` wrapper and its CSS (keep `.pet-wrap { position: relative; }`).

- [ ] **Step 3: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless: indicator is horizontal at the top, fill grows left→right at moods
100 / 0 / −50; no layout overflow.

```bash
git add src/components/MoodIndicator.vue src/App.vue
git commit -m "Move mood indicator to a horizontal top bar"
```

---

### Task 3: Room background, bear ears

**Files:**
- Create: `src/components/RoomScene.vue`
- Modify: `src/App.vue`, `src/three/character.ts`, `src/components/Tamagotchi.vue`, `README.MD`

**Interfaces:**
- Consumes: `away` computed.
- Produces: full-screen room layer; bear ears in 3D and SVG.

- [ ] **Step 1: Create `src/components/RoomScene.vue`**

```vue
<script setup lang="ts">
defineProps<{ away: boolean }>()
</script>

<template>
  <div class="room" aria-hidden="true">
    <svg class="scene" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
      <rect x="0" y="0" width="400" height="700" fill="#f3e9dc" />
      <rect x="0" y="470" width="400" height="230" fill="#e2c49c" />
      <rect x="0" y="466" width="400" height="8" fill="#cfa87c" />
      <rect x="42" y="150" width="110" height="130" rx="10" fill="#bcd8e8" stroke="#cfa87c" stroke-width="8" />
      <line x1="97" y1="150" x2="97" y2="280" stroke="#cfa87c" stroke-width="6" />
      <line x1="42" y1="215" x2="152" y2="215" stroke="#cfa87c" stroke-width="6" />
      <rect x="130" y="225" width="140" height="255" rx="8" fill="#8c5a3b" />
      <rect x="142" y="237" width="116" height="243" fill="#5c4033" />
      <g class="door" :class="{ closed: away }">
        <rect x="142" y="237" width="116" height="243" rx="4" fill="#b07b52" />
        <circle cx="232" cy="360" r="6" fill="#f4d35e" />
      </g>
      <ellipse cx="200" cy="600" rx="150" ry="40" fill="#cfe6d4" />
    </svg>
  </div>
</template>

<style scoped>
.room {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.scene {
  width: 100%;
  height: 100%;
  display: block;
}

.door {
  transform-box: fill-box;
  transform-origin: left center;
  transform: scaleX(0.18);
  transition: transform 0.9s ease;
}

.door.closed {
  transform: scaleX(1);
}
</style>
```

- [ ] **Step 2: App integration**

In `src/App.vue`:
- import `RoomScene` and render it as the first child of `.app`:
  `<RoomScene :away="away" />`;
- `.app` becomes `position: relative; z-index: 1;` and loses its
  `background: var(--tg-bg);` (the room covers the viewport);
- `.controls` gains a readable panel:
  `padding: 12px 16px; border-radius: 14px; background: var(--tg-secondary-bg); max-width: 340px;`;
- `.pet-wrap` reserves space for the speech bubble so it never covers the top
  indicator: `margin-top: 60px;`.

- [ ] **Step 3: Bear ears (3D)**

In `src/three/character.ts`, replace the ear loop body:

```ts
  for (const side of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(0.24, 10, 8), green)
    ear.scale.set(1, 1, 0.6)
    ear.position.set(side * 0.36, 1.16, 0)
    group.add(ear)

    const innerEar = new Mesh(new SphereGeometry(0.13, 8, 6), belly)
    innerEar.scale.set(1, 1, 0.5)
    innerEar.position.set(side * 0.36, 1.16, 0.12)
    group.add(innerEar)
  }
```

- [ ] **Step 4: Bear ears (SVG fallback)**

In `src/components/Tamagotchi.vue`, in the front SVG replace the two ear
circles with four (outer + inner), and in the back SVG replace the two ear
circles with the larger outers:

```html
            <circle cx="70" cy="54" r="17" fill="#7ec8a9" />
            <circle cx="130" cy="54" r="17" fill="#7ec8a9" />
            <circle cx="70" cy="54" r="8" fill="#a8dcc0" />
            <circle cx="130" cy="54" r="8" fill="#a8dcc0" />
```

Back view:

```html
            <circle cx="70" cy="54" r="17" fill="#7ec8a9" />
            <circle cx="130" cy="54" r="17" fill="#7ec8a9" />
```

- [ ] **Step 5: README**

Mention the room background (door closes when the pet leaves) and note that
generated-image backgrounds can replace it later (two images, same seed, door
open/closed, crossfaded on `away`).

- [ ] **Step 6: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless (software WebGL): the room renders behind the character; with an away
state the door leaf's computed transform is `scaleX(1)` (closed) and with a
present state `scaleX(0.18)`; bear ears visible in the 3D screenshots and the
SVG fallback.

```bash
git add src/components/RoomScene.vue src/App.vue src/three/character.ts src/components/Tamagotchi.vue README.MD
git commit -m "Add room background with animated door and bear ears"
```
