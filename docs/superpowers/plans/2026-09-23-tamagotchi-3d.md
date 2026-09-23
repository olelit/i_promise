# Tamagotchi Stage 4: 3D Character — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the tamagotchi as a procedural low-poly 3D figure on a WebGL canvas (three.js) with a calm idle animation, keeping all mood-driven behavior, and fall back to the SVG character when WebGL is unavailable.

**Architecture:** `src/three/character.ts` builds the model from three.js primitives (no assets); `src/components/Tamagotchi3D.vue` owns renderer/camera/lights/loop/disposal and maps props to the model; `src/webgl.ts` detects WebGL; `App.vue` lazily loads the 3D component and switches to the SVG on `unsupported`.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, three.js 0.186.

## Global Constraints

- Commit messages MUST be written in English only.
- All Telegram API access goes through `src/telegram.ts`; persistence through `src/storage.ts`; no backend/network.
- Vue SFCs use `<script setup lang="ts">`; TypeScript strict mode.
- Character palette is fixed and shared with the SVG version: `#7ec8a9`, `#a8dcc0`, `#2f4f43`, `#f4a3a3`, `#5da88b`.
- `three` is imported only by `src/three/character.ts` and `src/components/Tamagotchi3D.vue`; the component is lazily loaded so the SVG path does not pay for it.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: three.js, WebGL detection, procedural model

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/webgl.ts`
- Create: `src/three/character.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isWebglAvailable(): boolean`; `Character` (`{ group: Group; mouth: Object3D; leftEye: Object3D; rightEye: Object3D; leftBrow: Object3D; rightBrow: Object3D; blushMaterial: MeshStandardMaterial }`); `createCharacter(): Character`; `disposeObject(root: Object3D): void`.

- [ ] **Step 1: Install three.js**

```bash
npm install three
```

If `npm run typecheck` later reports missing types for `three`, also run
`npm install -D @types/three` (the package ships types for most versions).

- [ ] **Step 2: Create `src/webgl.ts`**

```ts
export function isWebglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
```

- [ ] **Step 3: Create `src/three/character.ts`**

```ts
import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three'

const BODY = 0x7ec8a9
const BELLY = 0xa8dcc0
const FEATURES = 0x2f4f43
const BLUSH = 0xf4a3a3
const CURL = 0x5da88b

export interface Character {
  group: Group
  mouth: Object3D
  leftEye: Object3D
  rightEye: Object3D
  leftBrow: Object3D
  rightBrow: Object3D
  blushMaterial: MeshStandardMaterial
}

function bodyMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 })
}

export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      const material = object.material
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose())
      } else {
        material.dispose()
      }
    }
  })
}

export function createCharacter(): Character {
  const group = new Group()
  const green = bodyMaterial(BODY)
  const belly = bodyMaterial(BELLY)
  const features = bodyMaterial(FEATURES)
  const curl = bodyMaterial(CURL)
  const white = bodyMaterial(0xffffff)
  const blushMaterial = new MeshStandardMaterial({
    color: BLUSH,
    flatShading: true,
    roughness: 0.9,
    transparent: true,
  })

  const head = new Mesh(new IcosahedronGeometry(0.55, 1), green)
  head.position.set(0, 0.75, 0)
  group.add(head)

  for (const side of [-1, 1]) {
    const ear = new Mesh(new IcosahedronGeometry(0.18, 0), green)
    ear.position.set(side * 0.42, 1.12, 0)
    group.add(ear)
  }

  const torso = new Mesh(new IcosahedronGeometry(0.62, 1), green)
  torso.scale.set(1, 1.15, 0.9)
  torso.position.set(0, -0.15, 0)
  group.add(torso)

  const bellyMesh = new Mesh(new SphereGeometry(0.42, 10, 8), belly)
  bellyMesh.scale.set(0.9, 1, 0.6)
  bellyMesh.position.set(0, -0.18, 0.42)
  group.add(bellyMesh)

  for (const side of [-1, 1]) {
    const arm = new Mesh(new CapsuleGeometry(0.12, 0.42, 4, 8), green)
    arm.position.set(side * 0.62, -0.15, 0)
    arm.rotation.z = side * 0.5
    group.add(arm)

    const foot = new Mesh(new CapsuleGeometry(0.14, 0.2, 4, 8), green)
    foot.position.set(side * 0.3, -0.78, 0.12)
    foot.rotation.x = Math.PI / 2
    group.add(foot)
  }

  const eyes: Object3D[] = []
  for (const side of [-1, 1]) {
    const eye = new Group()
    eye.position.set(side * 0.22, 0.82, 0.46)
    eye.add(new Mesh(new SphereGeometry(0.12, 8, 8), white))
    const pupil = new Mesh(new SphereGeometry(0.05, 8, 8), features)
    pupil.position.set(0, 0, 0.1)
    eye.add(pupil)
    group.add(eye)
    eyes.push(eye)
  }

  const brows: Object3D[] = []
  for (const side of [-1, 1]) {
    const brow = new Mesh(new BoxGeometry(0.22, 0.05, 0.05), features)
    brow.position.set(side * 0.22, 1, 0.5)
    group.add(brow)
    brows.push(brow)
  }

  const mouth = new Mesh(new TorusGeometry(0.16, 0.035, 8, 12, Math.PI), features)
  mouth.position.set(0, 0.62, 0.5)
  mouth.rotation.z = Math.PI
  group.add(mouth)

  for (const side of [-1, 1]) {
    const cheek = new Mesh(new SphereGeometry(0.09, 8, 6), blushMaterial)
    cheek.scale.set(1, 0.6, 0.4)
    cheek.position.set(side * 0.42, 0.68, 0.4)
    group.add(cheek)
  }

  const backCurl = new Mesh(new TorusGeometry(0.12, 0.03, 6, 10, Math.PI * 1.2), curl)
  backCurl.position.set(0.05, 1.15, -0.35)
  backCurl.rotation.set(0.4, 0.4, 0)
  group.add(backCurl)

  const tail = new Mesh(new SphereGeometry(0.12, 8, 6), belly)
  tail.scale.set(1, 0.7, 0.5)
  tail.position.set(0, -0.72, -0.5)
  group.add(tail)

  return {
    group,
    mouth,
    leftEye: eyes[0],
    rightEye: eyes[1],
    leftBrow: brows[0],
    rightBrow: brows[1],
    blushMaterial,
  }
}
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/webgl.ts src/three/character.ts
git commit -m "Add three.js and procedural low-poly character"
```

---

### Task 2: 3D character component

**Files:**
- Create: `src/components/Tamagotchi3D.vue`

**Interfaces:**
- Consumes: `createCharacter`, `disposeObject`, `Character` from `src/three/character.ts`.
- Produces: `Tamagotchi3D` component with props `{ mood: number; away: boolean }` and emit `unsupported` (no payload).

- [ ] **Step 1: Create `src/components/Tamagotchi3D.vue`**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Clock,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { createCharacter, disposeObject, type Character } from '../three/character'

const props = defineProps<{ mood: number; away: boolean }>()
const emit = defineEmits<{ unsupported: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)

const BASE_TURN_SPEED = 4
const BASE_MOVE_SPEED = 3
const FRAME_MS = 33

let renderer: WebGLRenderer | undefined
let scene: Scene | undefined
let camera: PerspectiveCamera | undefined
let character: Character | undefined
let frame = 0
let running = false
let lastRender = 0
let elapsed = 0
let baseYaw = 0
let baseX = 0
let idleYaw = 0
let idleTargetYaw = 0
let nextTurnAt = 6
let turnBackAt = 9

const clock = new Clock()

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function applyMood(): void {
  if (!character) {
    return
  }
  const t = clamp(props.mood / 100, 0, 1)
  character.mouth.rotation.z = Math.PI * t
  character.leftEye.scale.y = 1 - (1 - t) * 0.35
  character.rightEye.scale.y = 1 - (1 - t) * 0.35
  character.leftBrow.rotation.z = (1 - t) * 0.35
  character.rightBrow.rotation.z = -(1 - t) * 0.35
  character.blushMaterial.opacity = t
  character.blushMaterial.visible = t > 0.05
}

function renderFrame(time: number): void {
  if (!running) {
    return
  }
  frame = requestAnimationFrame(renderFrame)
  if (time - lastRender < FRAME_MS) {
    return
  }
  const dt = Math.min(0.1, clock.getDelta())
  lastRender = time
  elapsed += dt

  const targetYaw = props.mood <= 0 ? Math.PI : 0
  baseYaw += (targetYaw - baseYaw) * Math.min(1, dt * BASE_TURN_SPEED)
  const targetX = props.away ? -3.5 : 0
  baseX += (targetX - baseX) * Math.min(1, dt * BASE_MOVE_SPEED)

  if (elapsed >= nextTurnAt) {
    idleTargetYaw = (Math.random() - 0.5) * 0.5
    nextTurnAt = elapsed + 5 + Math.random() * 4
    turnBackAt = elapsed + 2 + Math.random() * 2
  }
  if (elapsed >= turnBackAt) {
    idleTargetYaw = 0
  }
  idleYaw += (idleTargetYaw - idleYaw) * Math.min(1, dt * 1.5)

  const crouch = props.mood < 0 ? -props.mood / 100 : 0
  const breathe = 1 + Math.sin(elapsed * 1.4) * 0.01

  if (character) {
    character.group.rotation.y = baseYaw + idleYaw
    character.group.rotation.z = Math.sin(elapsed * 0.9) * 0.04
    character.group.scale.y = (1 - crouch * 0.15) * breathe
    character.group.position.x = baseX
    character.group.position.y = -crouch * 0.12
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function stopLoop(): void {
  running = false
  cancelAnimationFrame(frame)
}

function startLoop(): void {
  if (running || !renderer) {
    return
  }
  running = true
  frame = requestAnimationFrame(renderFrame)
}

function handleVisibility(): void {
  if (document.visibilityState === 'hidden') {
    stopLoop()
  } else {
    startLoop()
  }
}

function start(): void {
  const element = canvas.value
  if (!element) {
    return
  }
  try {
    renderer = new WebGLRenderer({ canvas: element, antialias: true, alpha: true })
  } catch {
    emit('unsupported')
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(200, 200, false)
  renderer.setClearColor(0x000000, 0)

  scene = new Scene()
  camera = new PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0.2, 4.2)
  camera.lookAt(0, 0.05, 0)

  scene.add(new HemisphereLight(0xffffff, 0x444444, 1.1))
  const sun = new DirectionalLight(0xffffff, 1.2)
  sun.position.set(2, 3, 4)
  scene.add(sun)

  character = createCharacter()
  scene.add(character.group)
  applyMood()

  clock.start()
  startLoop()
  document.addEventListener('visibilitychange', handleVisibility)
}

watch(() => props.mood, applyMood)

onMounted(start)

onUnmounted(() => {
  stopLoop()
  document.removeEventListener('visibilitychange', handleVisibility)
  if (character) {
    disposeObject(character.group)
  }
  renderer?.dispose()
})
</script>

<template>
  <div class="scene">
    <canvas ref="canvas" class="canvas"></canvas>
  </div>
</template>

<style scoped>
.scene,
.canvas {
  width: 200px;
  height: 200px;
  display: block;
}
</style>
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0 (a separate chunk for this component appears once it is lazily imported in Task 3; standalone it is tree-shaken, which is fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/Tamagotchi3D.vue
git commit -m "Add 3D character component with idle animation"
```

---

### Task 3: App integration, fallback, docs

**Files:**
- Modify: `src/App.vue`
- Modify: `README.MD`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `isWebglAvailable`, `Tamagotchi3D`, the existing SVG `Tamagotchi`.
- Produces: the stage-4 app.

- [ ] **Step 1: Update `src/App.vue`**

Add imports:

```ts
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { isWebglAvailable } from './webgl'
import Tamagotchi from './components/Tamagotchi.vue'

const Tamagotchi3D = defineAsyncComponent({
  loader: () => import('./components/Tamagotchi3D.vue'),
  loadingComponent: Tamagotchi,
  onError(_error, _retry, fail) {
    use3d.value = false
    fail()
  },
})
```

(`use3d` is declared with the other refs, before this call.)

Add state next to the other refs:

```ts
const use3d = ref(isWebglAvailable())
```

Replace the character in the template:

```html
      <div class="pet-row">
        <div class="pet-wrap">
          <SpeechBubble :message="phrase" />
          <Tamagotchi3D
            v-if="use3d"
            :mood="current.mood"
            :away="away"
            @unsupported="use3d = false"
          />
          <Tamagotchi v-else :mood="current.mood" :away="away" />
        </div>
        <MoodIndicator :mood="current.mood" />
      </div>
```

(The existing `Tamagotchi` import stays for the fallback; make sure the import
list is merged with the current one, which already imports `Tamagotchi`.)

- [ ] **Step 2: Update `README.MD`**

In the structure list, add:

```markdown
- `src/webgl.ts` — проверка доступности WebGL
- `src/three/character.ts` — процедурная low-poly 3D-модель персонажа
- `src/components/Tamagotchi3D.vue` — 3D-персонаж (three.js) с idle-анимацией
```

And a short paragraph in the description or mechanics section:

```markdown
Персонаж рисуется в 3D (three.js, low-poly, без ассетов) и слегка покачивается.
Если WebGL недоступен (например, в некоторых сборках Telegram Desktop),
автоматически показывается SVG-версия.
```

- [ ] **Step 3: Update `AGENTS.md`**

Add to Conventions:

```markdown
- The 3D character uses `three`, imported only by `src/three/character.ts` and
  `src/components/Tamagotchi3D.vue`; the component is lazily loaded and must
  fall back to the SVG `Tamagotchi.vue` when WebGL is unavailable.
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0 and the output lists a separate JS chunk for
`Tamagotchi3D` (three.js is in it).

- [ ] **Step 5: Browser checks**

- WebGL path: launch headless Chrome with software WebGL (no `--disable-gpu`,
  add `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` if
  needed), inject a state via CDP before load (about:blank → `Page.enable` →
  `Page.addScriptToEvaluateOnNewDocument` → `Page.navigate`), confirm
  `document.querySelector('canvas')` exists, the WebGL context is non-null, and
  take screenshots at moods `100`, `0`, `-50` and an away state; describe what
  the screenshots show (smiling face, back, crouched back, off-canvas).
- Fallback path: inject a script that makes WebGL unavailable
  (`HTMLCanvasElement.prototype.getContext = function (type) { if (String(type).includes('webgl')) return null; return original.call(this, type) }`)
  before load; confirm the SVG character (`.face` element) is rendered and the
  console has no errors.
- Idle animation: take two screenshots ~1.5 s apart at mood 100 and confirm the
  character's transform changed (e.g. query `character.group.rotation` via a
  small test hook is not available — instead compare the images' pixel
  difference or read the canvas `toDataURL` twice and compare strings).
Kill Chrome and the dev server afterwards.

- [ ] **Step 6: Commit**

```bash
git add src/App.vue README.MD AGENTS.md
git commit -m "Render the character in 3D with SVG fallback"
```
