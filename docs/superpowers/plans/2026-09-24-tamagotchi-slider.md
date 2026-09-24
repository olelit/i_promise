# Tamagotchi Stage 7: Interactive Mood Bar, Smooth Transitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the top mood bar draggable (Telegram and browser), remove the browser «Тест анимаций» button, and animate the character's face changes.

**Architecture:** `MoodIndicator` overlays a transparent range input when `interactive`; `App.vue` handles `setMood` (updating and persisting the state, entering the away state at `-100`) and drops the test button; `Tamagotchi.vue` gets CSS transitions for the face geometry.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9.

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no backend/network.
- `<script setup lang="ts">`, strict TS.
- 2D transforms only; fixed character and room palettes.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Interactive mood bar, remove the test button

**Files:**
- Modify: `src/components/MoodIndicator.vue`, `src/App.vue`

**Interfaces:**
- Consumes: `MOOD_MAX`, `MOOD_MIN`, `AWAY_DURATION_MS`.
- Produces: `MoodIndicator` props `{ mood: number; interactive?: boolean }`, emit `setMood`; `handleSetMood` in `App.vue`.

- [ ] **Step 1: Replace `src/components/MoodIndicator.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'

const props = defineProps<{ mood: number; interactive?: boolean }>()
const emit = defineEmits<{ setMood: [mood: number] }>()

const fraction = computed(() =>
  Math.min(1, Math.max(0, (props.mood - MOOD_MIN) / (MOOD_MAX - MOOD_MIN))),
)
const hue = computed(() => 120 * Math.min(1, Math.max(0, props.mood / MOOD_MAX)))
const fillStyle = computed(() => ({
  width: `${fraction.value * 100}%`,
  background: `hsl(${hue.value}, 70%, 45%)`,
}))

function handleInput(event: Event): void {
  emit('setMood', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="meter-wrap">
    <div
      class="meter"
      role="meter"
      :aria-hidden="interactive ? 'true' : undefined"
      aria-label="Настроение"
      :aria-valuemin="MOOD_MIN"
      :aria-valuemax="MOOD_MAX"
      :aria-valuenow="Math.round(mood)"
    >
      <div class="fill" :style="fillStyle"></div>
    </div>
    <input
      v-if="interactive"
      class="range"
      type="range"
      :min="MOOD_MIN"
      :max="MOOD_MAX"
      step="1"
      :value="Math.round(mood)"
      aria-label="Настроение"
      @input="handleInput"
    />
  </div>
</template>

<style scoped>
.meter-wrap {
  position: relative;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.meter {
  width: 100%;
  height: 14px;
  border-radius: 7px;
  background: var(--tg-secondary-bg);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.2s ease, background 0.6s ease;
}

.range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: `src/App.vue`**

Add the handler next to `handleFeed`:

```ts
function handleSetMood(mood: number): void {
  now.value = Date.now()
  state.value = {
    ...state.value,
    mood,
    lastSeen: now.value,
    awayUntil: mood <= MOOD_MIN ? now.value + AWAY_DURATION_MS : null,
  }
  void saveState(state.value)
}
```

Remove `TEST_MOODS`, `testStep`, `handleTestAnimation`, the «Тест анимаций»
button in the template and its `.test-button` style. Keep the
`AWAY_DURATION_MS`/`MOOD_MIN` imports.

Update the indicator usage:

```html
    <MoodIndicator :mood="current.mood" interactive @set-mood="handleSetMood" />
```

- [ ] **Step 3: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless: set the range input's value and dispatch `input` → the fill width and
the character change; `-100` shows the away message; the test button is absent.

```bash
git add src/components/MoodIndicator.vue src/App.vue
git commit -m "Make the mood bar draggable and drop the test button"
```

---

### Task 2: Smooth face transitions

**Files:**
- Modify: `src/components/Tamagotchi.vue`, `README.MD`

**Interfaces:**
- Consumes: nothing new.
- Produces: animated face geometry.

- [ ] **Step 1: Face transitions**

Add to the scoped styles of `src/components/Tamagotchi.vue`:

```css
.face path,
.face ellipse,
.face circle,
.face line {
  transition:
    d 0.4s ease,
    rx 0.4s ease,
    ry 0.4s ease,
    cy 0.4s ease,
    transform 0.4s ease,
    opacity 0.4s ease;
}
```

- [ ] **Step 2: README**

Mention that the mood bar can be dragged to preview states, and that face
changes animate.

- [ ] **Step 3: Verify and commit**

`npm run typecheck`, `npm run build` → exit 0.
Headless: jump the mood (e.g. from `100` to `0` via the range input) and sample
the mouth path's `d` attribute ~150ms later — it must differ from both the old
and the final value (the transition is running); the fill's computed
`transition-property` includes `width`.

```bash
git add src/components/Tamagotchi.vue README.MD
git commit -m "Animate the character's face changes"
```
