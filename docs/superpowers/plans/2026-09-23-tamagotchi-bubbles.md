# Tamagotchi Stage 3: Speech Bubbles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a cloud above the tamagotchi with a phrase reacting to the user's actions (feeding, tasks) and to state changes (away, return, overdue).

**Architecture:** A pure `src/phrases.ts` maps events to phrase lists and picks one without immediate repeats; a presentational `SpeechBubble.vue` shows the current message for 4 seconds; `App.vue` emits phrases from its action handlers and from `commitTransitions` (overdue/away/return detection).

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, vue-tsc 3.3.

## Global Constraints

- Commit messages MUST be written in English only.
- All Telegram API access goes through `src/telegram.ts`; never add a Telegram npm SDK.
- All persistence goes through `src/storage.ts`.
- No backend, no network requests.
- Vue SFCs use `<script setup lang="ts">`; TypeScript strict mode.
- UI chrome colors come only from the theme CSS custom properties defined in `App.vue`; the character palette is fixed.
- Phrases are Russian; the previous phrase for the same event must never repeat immediately.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus listed browser checks.

---

### Task 1: Phrases and bubble component

**Files:**
- Create: `src/phrases.ts`
- Create: `src/components/SpeechBubble.vue`

**Interfaces:**
- Consumes: nothing.
- Produces: `PhraseEvent` union and `pickPhrase(event: PhraseEvent): string`; `SpeechBubble` component with prop `message: { text: string; id: number } | null`.

- [ ] **Step 1: Create `src/phrases.ts`**

```ts
export type PhraseEvent =
  | 'greeting'
  | 'feed'
  | 'feedAtCap'
  | 'feedCooldown'
  | 'taskStart'
  | 'taskComplete'
  | 'taskExtend'
  | 'taskAbandon'
  | 'overdue'
  | 'awayStart'
  | 'returned'

export const PHRASES: Record<PhraseEvent, string[]> = {
  greeting: ['Привет! Как дела?', 'Я скучал!', 'Чем займёмся?'],
  feed: ['Ням-ням! Спасибо!', 'Вкусно!', 'Ещё бы чуть-чуть!'],
  feedAtCap: ['Спасибо, я сыт!', 'Мне больше не влезет', 'Я и так доволен!'],
  feedCooldown: ['Я ещё не проголодался', 'Давай попозже', 'Я сегодня уже ел'],
  taskStart: ['Ого, задача! Я помогу!', 'Берусь!', 'Звучит серьёзно!'],
  taskComplete: ['Ура, всё готово!', 'Мы справились!', 'Отличная работа!'],
  taskExtend: ['Ещё часик? Ладно...', 'Хорошо, но я буду быстрее уставать', 'Время летит...'],
  taskAbandon: ['Эх... ладно', 'Ну вот...', 'Обидно'],
  overdue: ['Время вышло... я расстроен', 'Ты обещал успеть...', 'Задача просрочена...'],
  awayStart: ['Я ухожу...', 'Мне грустно...', 'Оставь меня ненадолго'],
  returned: ['Я вернулся!', 'Скучал по тебе', 'Ну что, продолжим?'],
}

const lastPicks = new Map<PhraseEvent, string>()

export function pickPhrase(event: PhraseEvent): string {
  const options = PHRASES[event]
  const previous = lastPicks.get(event)
  const candidates = options.length > 1 ? options.filter((phrase) => phrase !== previous) : options
  const phrase = candidates[Math.floor(Math.random() * candidates.length)]
  lastPicks.set(event, phrase)
  return phrase
}
```

- [ ] **Step 2: Create `src/components/SpeechBubble.vue`**

```vue
<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const props = defineProps<{ message: { text: string; id: number } | null }>()

const visible = ref(false)
let timer: number | undefined

watch(
  () => props.message,
  (message) => {
    if (timer !== undefined) {
      window.clearTimeout(timer)
    }
    if (message === null) {
      visible.value = false
      return
    }
    visible.value = true
    timer = window.setTimeout(() => {
      visible.value = false
    }, 4000)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer !== undefined) {
    window.clearTimeout(timer)
  }
})
</script>

<template>
  <Transition name="bubble">
    <p v-if="visible && message !== null" class="bubble">{{ message.text }}</p>
  </Transition>
</template>

<style scoped>
.bubble {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
  font-size: 14px;
  line-height: 1.3;
  max-width: 220px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--tg-secondary-bg);
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.9);
}
</style>
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/phrases.ts src/components/SpeechBubble.vue
git commit -m "Add phrases and speech bubble component"
```

---

### Task 2: Trigger wiring

**Files:**
- Modify: `src/components/MoodControls.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `pickPhrase`, `PhraseEvent`, `SpeechBubble`, stage-2 app.
- Produces: the stage-3 app; `MoodControls` gains a `feedBlocked` emit.

- [ ] **Step 1: Add a blocked-feed emit to `src/components/MoodControls.vue`**

Change the emits and add a wrapper handler:

```ts
const emit = defineEmits<{ feed: []; feedBlocked: [] }>()

function handleWrapClick(): void {
  if (props.nextFeedMs !== null) {
    emit('feedBlocked')
  }
}
```

Wrap the button in the template (the disabled button must not swallow clicks):

```html
      <div class="feed-wrap" @click="handleWrapClick">
        <button class="feed" type="button" :disabled="nextFeedMs !== null" @click.stop="handleFeed">
          {{ feedLabel }}
        </button>
      </div>
```

Add to the scoped styles:

```css
.feed-wrap {
  display: inline-flex;
}

.feed:disabled {
  pointer-events: none;
}
```

(merge `pointer-events: none` into the existing `.feed:disabled` rule.)

- [ ] **Step 2: Update `src/App.vue`**

Add imports:

```ts
import { pickPhrase, type PhraseEvent } from './phrases'
import SpeechBubble from './components/SpeechBubble.vue'
```

Add the bubble state and helper after the `task` computed:

```ts
const phrase = ref<{ text: string; id: number } | null>(null)
let phraseId = 0

function say(event: PhraseEvent): void {
  phraseId += 1
  phrase.value = { text: pickPhrase(event), id: phraseId }
}
```

Change `handleFeed` to pick the right event:

```ts
function handleFeed(): void {
  now.value = Date.now()
  if (!canFeed(current.value, now.value)) {
    return
  }
  const atCap = current.value.mood >= FEED_CAP
  state.value = feedState(current.value, now.value)
  void saveState(state.value)
  say(atCap ? 'feedAtCap' : 'feed')
}
```

(import `FEED_CAP` from `./tamagotchi`.)

Add `say(...)` calls to the task handlers:

```ts
function handleTaskStart(input: { hours: number; description: string }): void {
  now.value = Date.now()
  state.value = startTask(current.value, input, now.value)
  void saveState(state.value)
  createOpen.value = false
  say('taskStart')
}

function handleTaskComplete(): void {
  now.value = Date.now()
  state.value = completeTask(current.value, now.value)
  void saveState(state.value)
  infoOpen.value = false
  say('taskComplete')
}

function handleTaskExtend(): void {
  now.value = Date.now()
  state.value = extendTask(current.value, now.value)
  void saveState(state.value)
  say('taskExtend')
}

function handleTaskAbandon(): void {
  now.value = Date.now()
  state.value = abandonTask(current.value, now.value)
  void saveState(state.value)
  infoOpen.value = false
  say('taskAbandon')
}
```

Extend `commitTransitions` to announce transitions:

```ts
function commitTransitions(): void {
  const before = state.value
  const next = applyDecay(before, now.value)
  if (next.awayUntil !== before.awayUntil || next.lastSeen !== before.lastSeen) {
    state.value = next
    void saveState(next)
    if (before.task !== null && next.task === null) {
      say('overdue')
    }
    if (before.awayUntil === null && next.awayUntil !== null) {
      say('awayStart')
    }
    if (before.awayUntil !== null && next.awayUntil === null) {
      say('returned')
    }
  }
}
```

In `onMounted`, greet after the state is loaded and before transitions are committed
(so an overdue/returned phrase can replace the greeting):

```ts
  const loaded = await loadState()
  if (loaded) {
    state.value = loaded
  }
  now.value = Date.now()
  say('greeting')
  commitTransitions()
```

Handle the blocked feed: add `@feed-blocked="say('feedCooldown')"` to the
`MoodControls` usage.

Wrap the character in a positioned container with the bubble:

```html
      <div class="pet-row">
        <div class="pet-wrap">
          <SpeechBubble :message="phrase" />
          <Tamagotchi :mood="current.mood" :away="away" />
        </div>
        <MoodIndicator :mood="current.mood" />
      </div>
```

Add the style:

```css
.pet-wrap {
  position: relative;
}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck` → exits 0.
Run: `npm run build` → exits 0.

- [ ] **Step 4: Browser checks (headless)**

- On load a greeting phrase appears above the character and disappears after ~4s;
- feeding shows a feed phrase; clicking the disabled feed button shows a cooldown phrase;
- starting a task shows a task-start phrase; completing/extending/abandoning shows the matching phrase;
- injected overdue state shows an overdue phrase on load;
- the same phrase never appears twice in a row for one event (trigger feeding twice).
Kill the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/components/MoodControls.vue src/App.vue
git commit -m "Show speech bubbles on actions and state changes"
```

---

### Task 3: Documentation

**Files:**
- Modify: `README.MD`

**Interfaces:**
- Consumes: the stage-3 app.
- Produces: docs.

- [ ] **Step 1: Add a short section to `README.MD`**

```markdown
## Реплики

Тамагочи комментирует происходящее облаком над головой: приветствие при
открытии, кормление, старт и завершение задач, продления, отказ, просрочка,
уход и возвращение.
```

- [ ] **Step 2: Verify build and commit**

Run: `npm run build` → exits 0.

```bash
git add README.MD
git commit -m "Document speech bubbles"
```
