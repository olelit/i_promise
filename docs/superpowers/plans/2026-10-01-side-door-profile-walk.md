# Tamagotchi Stage 11: Side Door, Profile Walk, Round Window — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the door to the right edge, walk the character to it in profile with turns, and replace the rectangular window with a round porthole.

**Architecture:** `room.ts` moves the door/tree/knob constants to the right and swaps the rectangular window for a pixel porthole map; `RoomScene.vue` renders it without the window clip. `character.ts` gains profile walk sprites and phase timing constants; `Tamagotchi.vue` replaces its single walk transition with a two-axis (X then Y) phase machine driven by those constants; `App.vue` and `RoomScene.vue` switch from `WALK_MS` to `LEAVE_MS`.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9.

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no backend/network.
- `<script setup lang="ts">`, strict TS.
- The game world (room, character, mood bar, speech bubble) uses the fixed pixel palette from `src/pixel/palette.ts`; native chrome keeps the Telegram theme variables.
- No binary assets, no external asset service, no new dependencies.
- All room geometry snaps to the art grid: viewBox `400×700`, virtual pixel `2×2` units, every room coordinate even.
- The character sprite grid is `48×48`, displayed in the `240×240` element (`5×`).
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus the listed browser checks.

---

### Task 1: Door on the right and round porthole window

**Files:**
- Modify: `src/pixel/room.ts`, `src/components/RoomScene.vue`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DOOR_FRAME = { x: 204, y: 180, width: 184, height: 300 }`,
  `DOOR_OPENING = { x: 216, y: 192, width: 160, height: 288 }`,
  `TREE_POS = { x: 340, y: 320 }`,
  `KNOB = { x: 356, y: 340, width: 8, height: 8 }`,
  `WINDOW = { x: 16, y: 170, width: 80, height: 80 }`,
  `WINDOW_MAP` (40×40 px), `SUN_MAP` (16×16 px), `MOON_MAP` (14×14 px),
  `SUN_POS = { x: 40, y: 194 }`, `MOON_POS = { x: 42, y: 196 }`.
  Removes `WINDOW_FRAME`, `WINDOW_PANE`, `WINDOW_BAR_V`, `WINDOW_BAR_H`.
- Transitional state: the character's walk still targets the old center
  position in this task; Task 2 moves the walk target to the new door. This is
  expected between the two commits.

- [ ] **Step 1: Move the door geometry in `src/pixel/room.ts`**

Replace these lines:

```ts
export const DOOR_FRAME = { x: 108, y: 180, width: 184, height: 300 }
export const DOOR_OPENING = { x: 120, y: 192, width: 160, height: 288 }
export const WINDOW_FRAME = { x: 20, y: 150, width: 72, height: 120 }
export const WINDOW_PANE = { x: 24, y: 154, width: 64, height: 112 }
export const WINDOW_BAR_V = { x: 52, y: 154, width: 8, height: 112 }
export const WINDOW_BAR_H = { x: 24, y: 206, width: 64, height: 8 }
export const RUG = { x: 60, y: 524, width: 280, height: 72 }
export const SUN_POS = { x: 20, y: 142 }
export const MOON_POS = { x: 24, y: 146 }
export const TREE_POS = { x: 244, y: 320 }
```

with:

```ts
export const DOOR_FRAME = { x: 204, y: 180, width: 184, height: 300 }
export const DOOR_OPENING = { x: 216, y: 192, width: 160, height: 288 }
export const WINDOW = { x: 16, y: 170, width: 80, height: 80 }
export const RUG = { x: 60, y: 524, width: 280, height: 72 }
export const SUN_POS = { x: 40, y: 194 }
export const MOON_POS = { x: 42, y: 196 }
export const TREE_POS = { x: 340, y: 320 }
```

and change the knob line:

```ts
export const KNOB = { x: 260, y: 340, width: 8, height: 8 }
```

to:

```ts
export const KNOB = { x: 356, y: 340, width: 8, height: 8 }
```

- [ ] **Step 2: Swap the window and celestial maps in `src/pixel/room.ts`**

Replace the `SUN_MAP` and `MOON_MAP` blocks with (and add `WINDOW_MAP`
above them):

```ts
export const WINDOW_MAP: PixelMap = (() => {
  const canvas = createCanvas(40, 40)
  fillEllipse(canvas, 20, 20, 20, 20, 'D')
  fillEllipse(canvas, 20, 20, 18, 18, 'B')
  fillEllipse(canvas, 20, 20, 16, 16, 'K')
  return toPixelMap(canvas)
})()

export const SUN_MAP: PixelMap = (() => {
  const canvas = createCanvas(16, 16)
  fillEllipse(canvas, 8, 8, 8, 8, 'S')
  return toPixelMap(canvas)
})()

export const MOON_MAP: PixelMap = (() => {
  const canvas = createCanvas(14, 14)
  fillEllipse(canvas, 7, 7, 7, 7, 'M')
  fillEllipse(canvas, 5, 5, 1, 1, 'C')
  fillEllipse(canvas, 8, 9, 1, 1, 'C')
  return toPixelMap(canvas)
})()
```

- [ ] **Step 3: Rewrite `src/components/RoomScene.vue`**

Replace the whole file with (the door-frame state and the front leaf are
unchanged; the window clip and bars are gone):

```vue
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import PixelSprite from './PixelSprite.vue'
import { PALETTE } from '../pixel/palette'
import {
  BASEBOARD,
  DOOR_EDGE,
  DOOR_FRAME,
  DOOR_GRASS,
  DOOR_LEAF_WIDTHS,
  DOOR_OPENING,
  DOOR_STEP_MS,
  FLOOR,
  KNOB,
  MOON_MAP,
  MOON_POS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  RUG,
  RUG_MAP,
  SUN_MAP,
  SUN_POS,
  TREE_MAP,
  TREE_POS,
  WALL,
  WINDOW,
  WINDOW_MAP,
} from '../pixel/room'
import { WALK_MS } from '../pixel/character'

const props = defineProps<{ away: boolean; front?: boolean; now: number; animate?: boolean }>()

function daylightAt(timestamp: number): number {
  const date = new Date(timestamp)
  const hour = date.getHours() + date.getMinutes() / 60
  if (hour >= 8 && hour <= 20) {
    return 1
  }
  if (hour >= 6 && hour < 8) {
    return (hour - 6) / 2
  }
  if (hour > 20 && hour <= 22) {
    return (22 - hour) / 2
  }
  return 0
}

const daylight = computed(() => daylightAt(props.now))
const nightOpacity = computed(() => 0.45 * (1 - daylight.value))

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const doorFrame = ref(props.away ? DOOR_LEAF_WIDTHS.length - 1 : 0)
const leafWidth = computed(() => DOOR_LEAF_WIDTHS[doorFrame.value])

let doorTimer: number | undefined
let doorDelay: number | undefined

function clearDoorTimers(): void {
  if (doorTimer !== undefined) {
    window.clearInterval(doorTimer)
    doorTimer = undefined
  }
  if (doorDelay !== undefined) {
    window.clearTimeout(doorDelay)
    doorDelay = undefined
  }
}

watch(
  () => props.away,
  (away) => {
    clearDoorTimers()
    if (props.animate === false) {
      doorFrame.value = away ? DOOR_LEAF_WIDTHS.length - 1 : 0
      return
    }
    if (reducedMotion) {
      doorFrame.value = away ? DOOR_LEAF_WIDTHS.length - 1 : 0
      return
    }
    if (away) {
      doorDelay = window.setTimeout(() => {
        doorTimer = window.setInterval(() => {
          if (doorFrame.value < DOOR_LEAF_WIDTHS.length - 1) {
            doorFrame.value += 1
          } else {
            clearDoorTimers()
          }
        }, DOOR_STEP_MS)
      }, WALK_MS)
    } else if (doorFrame.value > 0) {
      doorTimer = window.setInterval(() => {
        if (doorFrame.value > 0) {
          doorFrame.value -= 1
        } else {
          clearDoorTimers()
        }
      }, DOOR_STEP_MS)
    }
  },
)

onUnmounted(clearDoorTimers)
</script>

<template>
  <div class="room" :class="{ front }" aria-hidden="true">
    <svg
      class="scene"
      :viewBox="`0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}`"
      preserveAspectRatio="xMidYMid slice"
      shape-rendering="crispEdges"
    >
      <template v-if="!front">
        <defs>
          <clipPath id="room-door-opening">
            <rect
              :x="DOOR_OPENING.x"
              :y="DOOR_OPENING.y"
              :width="DOOR_OPENING.width"
              :height="DOOR_OPENING.height"
            />
          </clipPath>
        </defs>
        <rect :x="WALL.x" :y="WALL.y" :width="WALL.width" :height="WALL.height" :fill="PALETTE.W" />
        <rect :x="FLOOR.x" :y="FLOOR.y" :width="FLOOR.width" :height="FLOOR.height" :fill="PALETTE.F" />
        <rect
          :x="BASEBOARD.x"
          :y="BASEBOARD.y"
          :width="BASEBOARD.width"
          :height="BASEBOARD.height"
          :fill="PALETTE.B"
        />
        <rect
          :x="DOOR_FRAME.x"
          :y="DOOR_FRAME.y"
          :width="DOOR_FRAME.width"
          :height="DOOR_FRAME.height"
          :fill="PALETTE.D"
        />
        <g clip-path="url(#room-door-opening)">
          <rect
            :x="DOOR_OPENING.x"
            :y="DOOR_OPENING.y"
            :width="DOOR_OPENING.width"
            :height="DOOR_OPENING.height"
            :fill="PALETTE.O"
          />
          <rect
            :x="DOOR_OPENING.x"
            :y="DOOR_GRASS.y"
            :width="DOOR_OPENING.width"
            :height="DOOR_GRASS.height"
            :fill="PALETTE.G"
          />
          <PixelSprite :map="TREE_MAP" :x="TREE_POS.x" :y="TREE_POS.y" :scale="2" />
        </g>
        <PixelSprite :map="WINDOW_MAP" :x="WINDOW.x" :y="WINDOW.y" :scale="2" />
        <PixelSprite
          :map="SUN_MAP"
          :x="SUN_POS.x"
          :y="SUN_POS.y"
          :scale="2"
          :opacity="daylight"
        />
        <PixelSprite
          :map="MOON_MAP"
          :x="MOON_POS.x"
          :y="MOON_POS.y"
          :scale="2"
          :opacity="1 - daylight"
        />
        <PixelSprite :map="RUG_MAP" :x="RUG.x" :y="RUG.y" :scale="2" />
        <rect x="0" y="0" width="400" height="700" :fill="PALETTE.N" :opacity="nightOpacity" />
      </template>
      <g v-else>
        <rect
          v-if="leafWidth > 0"
          :x="DOOR_OPENING.x"
          :y="DOOR_OPENING.y"
          :width="leafWidth"
          :height="DOOR_OPENING.height"
          :fill="PALETTE.L"
        />
        <rect
          v-if="leafWidth > 0 && leafWidth < DOOR_OPENING.width"
          :x="DOOR_OPENING.x + leafWidth - DOOR_EDGE"
          :y="DOOR_OPENING.y"
          :width="DOOR_EDGE"
          :height="DOOR_OPENING.height"
          :fill="PALETTE.D"
        />
        <rect
          v-if="leafWidth === DOOR_OPENING.width"
          :x="KNOB.x"
          :y="KNOB.y"
          :width="KNOB.width"
          :height="KNOB.height"
          :fill="PALETTE.S"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.room {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.room.front {
  z-index: 2;
}

.scene {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
```

- [ ] **Step 4: Verify and commit**

`npm run typecheck` and `npm run build` → exit 0.

Browser checks (`npm run dev`): the doorway and its frame sit at the right
edge, the tree stands in it; the window is a round porthole with a dark rim
and beige frame; the sun (day) or moon (night) crossfades inside it; the rug
and the character are still centered. The character's away walk still heads
to the old center position — that is the expected transitional state until
Task 2.

```bash
git add src/pixel/room.ts src/components/RoomScene.vue
git commit -m "Move the door to the right and make the window a porthole"
```

---

### Task 2: Profile walk to the side door

**Files:**
- Modify: `src/pixel/canvas.ts`, `src/pixel/character.ts`,
  `src/components/Tamagotchi.vue`, `src/components/RoomScene.vue`,
  `src/App.vue`, `README.MD`

**Interfaces:**
- Consumes: `DOOR_OPEN_MS` from `room.ts` (Task 1 geometry: door center
  `x=296`, character home `x=200`, rug `y=560`, door floor `y=480`).
- Produces:
  - `mirrorX(canvas: string[][]): string[][]` in `canvas.ts`.
  - `profileWalkMap(frame: 0 | 1, facing: 1 | -1): PixelMap` in
    `character.ts`.
  - `TURN_MS = 150`, `WALK_H_MS = 600`, `WALK_V_MS = 400`,
    `LEAVE_MS = TURN_MS + WALK_H_MS + TURN_MS + WALK_V_MS` in
    `character.ts`; `WALK_MS` is removed.
  - `Tamagotchi.vue` phases: `idle`, `out-turn`, `out-h`, `out-turn2`,
    `out-v`, `in-v`, `in-turn`, `in-h`, `in-turn2`, `reset`.

- [ ] **Step 1: Add `mirrorX` to `src/pixel/canvas.ts`**

Add after `shiftDown`:

```ts
export function mirrorX(canvas: string[][]): string[][] {
  return canvas.map((row) => [...row].reverse())
}
```

- [ ] **Step 2: Add profile sprites and phase timings to `src/pixel/character.ts`**

Replace the import block with:

```ts
import {
  createCanvas,
  fillEllipse,
  mirrorX,
  setPixel,
  shiftDown,
  stamp,
  toPixelMap,
  type PixelMap,
} from './canvas'
```

Replace the constants block:

```ts
export const SPRITE_SIZE = 48
export const WALK_MS = 600
export const WALK_FRAME_MS = 150
```

with:

```ts
export const SPRITE_SIZE = 48
export const WALK_FRAME_MS = 150
export const TURN_MS = 150
export const WALK_H_MS = 600
export const WALK_V_MS = 400
export const LEAVE_MS = TURN_MS + WALK_H_MS + TURN_MS + WALK_V_MS
```

Append after `walkMap`:

```ts
const PROFILE_EYE = ['ww', 'wd', 'ww']

function drawProfile(frame: 0 | 1): string[][] {
  const canvas = createCanvas(SPRITE_SIZE, SPRITE_SIZE)
  fillEllipse(canvas, 24, 17, 11, 10, 'g')
  fillEllipse(canvas, 29, 9, 5, 5, 'g')
  fillEllipse(canvas, 29, 9, 2, 2, 'l')
  fillEllipse(canvas, 34, 20, 2, 2, 'g')
  setPixel(canvas, 36, 20, 'd')
  stamp(canvas, PROFILE_EYE, 30, 14)
  fillEllipse(canvas, 24, 36, 9, 10, 'g')
  fillEllipse(canvas, 29, 39, 4, 6, 'l')
  fillEllipse(canvas, 27, 36, 3, 5, 'g')
  fillEllipse(canvas, 14, 41, 2, 1, 'l')
  if (frame === 0) {
    fillEllipse(canvas, 20, 44, 4, 3, 'g')
    fillEllipse(canvas, 29, 43, 4, 3, 'g')
  } else {
    fillEllipse(canvas, 20, 43, 4, 3, 'g')
    fillEllipse(canvas, 29, 44, 4, 3, 'g')
  }
  return canvas
}

export function profileWalkMap(frame: 0 | 1, facing: 1 | -1): PixelMap {
  const canvas = drawProfile(frame)
  return toPixelMap(facing === 1 ? canvas : mirrorX(canvas))
}
```

- [ ] **Step 3: Rewrite `src/components/Tamagotchi.vue`**

Replace the whole file with:

```vue
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import PixelSprite from './PixelSprite.vue'
import {
  BREATH_MS,
  characterMap,
  moodState,
  profileWalkMap,
  walkMap,
  WALK_FRAME_MS,
  TURN_MS,
  WALK_H_MS,
  WALK_V_MS,
  type MoodState,
} from '../pixel/character'
import { DOOR_OPEN_MS } from '../pixel/room'

const props = defineProps<{ mood: number; away: boolean; animate?: boolean }>()

type Phase =
  | 'idle'
  | 'out-turn'
  | 'out-h'
  | 'out-turn2'
  | 'out-v'
  | 'in-v'
  | 'in-turn'
  | 'in-h'
  | 'in-turn2'
  | 'reset'

const state = computed<MoodState>(() => moodState(props.mood))
const phase = ref<Phase>('idle')
const hidden = ref(false)
const atDoor = ref(props.away)
const walkFrame = ref<0 | 1>(0)
const breath = ref<0 | 1>(0)

let phaseTimer: number | undefined
let frameTimer: number | undefined
let breathTimer: number | undefined

function clearFrames(): void {
  if (frameTimer !== undefined) {
    window.clearInterval(frameTimer)
    frameTimer = undefined
  }
}

function clearPhase(): void {
  if (phaseTimer !== undefined) {
    window.clearTimeout(phaseTimer)
    phaseTimer = undefined
  }
  clearFrames()
}

function startFrames(): void {
  clearFrames()
  frameTimer = window.setInterval(() => {
    walkFrame.value = walkFrame.value === 0 ? 1 : 0
  }, WALK_FRAME_MS)
}

function later(ms: number, next: () => void): void {
  phaseTimer = window.setTimeout(() => {
    phaseTimer = undefined
    next()
  }, ms)
}

function leave(): void {
  hidden.value = false
  atDoor.value = true
  phase.value = 'out-turn'
  later(TURN_MS, () => {
    phase.value = 'out-h'
    startFrames()
    later(WALK_H_MS, () => {
      clearFrames()
      phase.value = 'out-turn2'
      later(TURN_MS, () => {
        phase.value = 'out-v'
        startFrames()
        later(WALK_V_MS, () => {
          clearFrames()
          phase.value = 'idle'
          hidden.value = true
        })
      })
    })
  })
}

function returnHome(): void {
  later(DOOR_OPEN_MS, () => {
    hidden.value = false
    atDoor.value = false
    phase.value = 'in-v'
    startFrames()
    later(WALK_V_MS, () => {
      clearFrames()
      phase.value = 'in-turn'
      later(TURN_MS, () => {
        phase.value = 'in-h'
        startFrames()
        later(WALK_H_MS, () => {
          clearFrames()
          phase.value = 'in-turn2'
          later(TURN_MS, () => {
            phase.value = 'idle'
          })
        })
      })
    })
  })
}

function resetHome(): void {
  hidden.value = false
  atDoor.value = false
  phase.value = 'reset'
  startFrames()
  later(WALK_H_MS, () => {
    clearFrames()
    phase.value = 'idle'
  })
}

watch(
  () => props.away,
  (away) => {
    clearPhase()
    if (props.animate === false) {
      phase.value = 'idle'
      hidden.value = away
      atDoor.value = away
      return
    }
    if (away) {
      leave()
    } else if (hidden.value) {
      returnHome()
    } else {
      resetHome()
    }
  },
)

breathTimer = window.setInterval(() => {
  breath.value = breath.value === 0 ? 1 : 0
}, BREATH_MS)

onUnmounted(() => {
  clearPhase()
  if (breathTimer !== undefined) {
    window.clearInterval(breathTimer)
  }
})

const key = computed(() => {
  if (phase.value === 'idle' || phase.value === 'in-turn2') {
    return state.value
  }
  if (phase.value === 'out-turn2' || phase.value === 'out-v' || phase.value === 'in-v') {
    return 'back'
  }
  return 'profile'
})

const map = computed(() => {
  switch (phase.value) {
    case 'out-turn':
      return profileWalkMap(0, 1)
    case 'out-h':
      return profileWalkMap(walkFrame.value, 1)
    case 'out-turn2':
      return characterMap('backStand', 0)
    case 'out-v':
    case 'in-v':
      return walkMap(walkFrame.value)
    case 'in-turn':
      return profileWalkMap(0, -1)
    case 'in-h':
    case 'reset':
      return profileWalkMap(walkFrame.value, -1)
    default:
      return characterMap(state.value, breath.value)
  }
})

const timingStyle = computed(() => ({
  '--turn-ms': `${TURN_MS}ms`,
  '--walk-h-ms': `${WALK_H_MS}ms`,
  '--walk-v-ms': `${WALK_V_MS}ms`,
}))
</script>

<template>
  <div class="scene" :style="timingStyle">
    <div
      class="move-x"
      :class="{ away: atDoor, reset: phase === 'reset', instant: animate === false }"
    >
      <div
        class="move-y"
        :class="{
          away: atDoor,
          reset: phase === 'reset',
          instant: animate === false,
          hidden,
        }"
      >
        <Transition name="sprite">
          <svg :key="key" class="layer" viewBox="0 0 48 48" aria-hidden="true">
            <PixelSprite :map="map" />
          </svg>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  width: 240px;
  height: 240px;
}

.move-x,
.move-y {
  width: 100%;
  height: 100%;
}

.move-x {
  transform: translateX(0);
  transition: transform var(--walk-h-ms) steps(3, end)
    calc(var(--walk-v-ms) + var(--turn-ms));
}

.move-x.away {
  transform: translateX(calc(96 / 700 * 100vh));
  transition-delay: var(--turn-ms);
}

.move-y {
  transform: translateY(0);
  transition: transform var(--walk-v-ms) steps(2, end);
}

.move-y.away {
  transform: translateY(calc(-80 / 700 * 100vh));
  transition-delay: calc(var(--turn-ms) + var(--walk-h-ms) + var(--turn-ms));
}

@media (min-aspect-ratio: 4/7) {
  .move-x.away {
    transform: translateX(24vw);
  }

  .move-y.away {
    transform: translateY(-22.5vw);
  }
}

.move-x.reset,
.move-y.reset {
  transition-delay: 0s;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.sprite-enter-active,
.sprite-leave-active {
  transition: opacity 0.15s ease;
}

.sprite-enter-from,
.sprite-leave-to {
  opacity: 0;
}

.instant {
  transition: none;
}

.hidden {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .move-x,
  .move-y {
    transition: none;
  }

  .sprite-enter-active,
  .sprite-leave-active {
    transition: none;
  }
}
</style>
```

- [ ] **Step 4: Switch the door delay to `LEAVE_MS` in `src/components/RoomScene.vue`**

Replace the import line:

```ts
import { WALK_MS } from '../pixel/character'
```

with:

```ts
import { LEAVE_MS } from '../pixel/character'
```

and the delay argument in the watcher:

```ts
      }, WALK_MS)
```

with:

```ts
      }, LEAVE_MS)
```

- [ ] **Step 5: Switch the bubble timer to `LEAVE_MS` in `src/App.vue`**

Replace:

```ts
import { WALK_MS } from './pixel/character'
```

with:

```ts
import { LEAVE_MS } from './pixel/character'
```

and inside the `watch(away, ...)` that hides the bubble:

```ts
  }, WALK_MS)
```

with:

```ts
  }, LEAVE_MS)
```

- [ ] **Step 6: Update `README.MD`**

Replace the animation paragraph (lines 8–13):

```markdown
Персонаж собран из дискретных пиксельных спрайтов: у настроения шесть
состояний — три выражения лица спереди и три позы спиной, — между ними
кроссфейд, а «дыхание» — смена двух кадров. При нуле персонаж поворачивается
спиной, при −100 идёт к дверному проёму, и дверь закрывается за ним
дискретными кадрами. Полосу настроения можно перетаскивать, чтобы посмотреть
все состояния.
```

with:

```markdown
Персонаж собран из дискретных пиксельных спрайтов: у настроения шесть
состояний — три выражения лица спереди и три позы спиной, — между ними
кроссфейд, а «дыхание» — смена двух кадров. При нуле персонаж поворачивается
спиной, при −100 разворачивается в профиль, идёт к двери справа, у проёма
снова поворачивается спиной и входит; дверь закрывается за ним дискретными
кадрами. Полосу настроения можно перетаскивать, чтобы посмотреть все
состояния.
```

Replace the room paragraph (lines 15–19):

```markdown
Комната, персонаж и полоса настроения — пиксель-арт, нарисованный из TypeScript.
Персонаж живёт в комнате и стоит на ковре в середине. В комнате есть день и
ночь: в окне кроссфейдом сменяются солнце и луна, за
открытой дверью виден двор — небо, трава и дерево, — а ночью комната
затемняется.
```

with:

```markdown
Комната, персонаж и полоса настроения — пиксель-арт, нарисованный из TypeScript.
Персонаж живёт в комнате и стоит на ковре в середине; дверь — у правого края,
окно — круглый иллюминатор слева. В комнате есть день и ночь: в иллюминаторе
кроссфейдом сменяются солнце и луна, за открытой дверью виден двор — небо,
трава и дерево, — а ночью комната затемняется.
```

Update the two structure bullets:

```markdown
- `src/pixel/character.ts` — спрайты персонажа по состояниям настроения
- `src/pixel/room.ts` — геометрия комнаты и карты ковра, дерева, солнца, луны
```

to:

```markdown
- `src/pixel/character.ts` — спрайты персонажа: состояния настроения и ходьба в профиль
- `src/pixel/room.ts` — геометрия комнаты и карты ковра, дерева, солнца, луны, иллюминатора
```

- [ ] **Step 7: Verify and commit**

`npm run typecheck` and `npm run build` → exit 0.

Browser checks (`npm run dev`): at −100 the character turns to profile, walks
right to the door, turns back, walks up into the doorway and disappears; the
door closes behind it. On return the door opens, the character walks down,
turns to profile, walks left to the rug, turns back and resumes its mood
sprite. Rapid slider toggles never leave it hidden or stuck. The speech bubble
disappears when the character enters.

```bash
git add src/pixel/canvas.ts src/pixel/character.ts src/components/Tamagotchi.vue src/components/RoomScene.vue src/App.vue README.MD
git commit -m "Walk the character to the side door in profile"
```

---

## Self-review notes

- Spec coverage: door geometry/tree/knob and the porthole (Task 1); profile
  sprites, `mirrorX`, timings, phase machine, two-axis movement, bubble and
  door delay, docs (Task 2).
- The profile sprite was prototyped and ASCII-checked before this plan was
  written; the movement math (96 units X, 80 units Y) matches the door center
  `x=296` against the home `x=200`.
- `WALK_MS` is removed in Task 2, so both `RoomScene.vue` and `App.vue` must
  switch to `LEAVE_MS` in the same task (Steps 4–5).
