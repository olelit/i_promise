# Tamagotchi Stage 13–14: Localization and Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the interface Russian/English with launch-time detection, and add a rules dialog shown once on the first launch plus a «Правила» button.

**Architecture:** `src/i18n.ts` owns locale detection (`language_code` → `navigator.language`, `ru*` else English), a typed `messages` catalog with `m(entry)`, skin names and `formatRemaining` (moved out of `tamagotchi.ts`); components read the catalog. `phrases.ts` becomes bilingual. The rules flag `rulesSeen` joins the state, and `RulesDialog.vue` is wired to auto-show once and to a button in the always-rendered bottom row.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9.

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram access via `src/telegram.ts`; persistence via `src/storage.ts`; no backend/network.
- `<script setup lang="ts">`, strict TS.
- No i18n library and no new dependencies; a small typed catalog instead.
- Locale: `ru*` → `ru`, everything else → `en`; fixed at startup.
- No test suite: verification per task is `npm run typecheck` + `npm run build` plus the listed browser checks.

---

### Task 1: i18n core and UI strings

**Files:**
- Create: `src/i18n.ts`
- Modify: `src/tamagotchi.ts`, `src/pixel/skins.ts`, `src/App.vue`,
  `src/components/MoodControls.vue`, `src/components/MoodIndicator.vue`,
  `src/components/TaskCreateDialog.vue`, `src/components/TaskInfoDialog.vue`,
  `src/components/SkinDialog.vue`, `README.MD`

**Interfaces:**
- Produces:
  - `Locale = 'ru' | 'en'`, `locale: Locale` in `src/i18n.ts`.
  - `messages` catalog, `m<T>(entry: { ru: T; en: T }): T`.
  - `SKIN_NAMES: Record<SkinId, { ru: string; en: string }>`,
    `skinName(id: SkinId): string`.
  - `formatRemaining(ms: number): string` in `src/i18n.ts`;
    `formatRemaining` is removed from `src/tamagotchi.ts`.
  - `Skin` loses its `name` field.

- [ ] **Step 1: Create `src/i18n.ts`**

```ts
import { getWebApp } from './telegram'
import type { SkinId } from './tamagotchi'

export type Locale = 'ru' | 'en'

function detectLocale(): Locale {
  const code =
    getWebApp()?.initDataUnsafe?.user?.language_code ??
    (typeof navigator === 'undefined' ? '' : navigator.language)
  return code.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export const locale: Locale = detectLocale()

export function m<T>(entry: { ru: T; en: T }): T {
  return locale === 'ru' ? entry.ru : entry.en
}

export const messages = {
  banner: {
    ru: 'Приложение открыто не в Telegram: настроение хранится локально в браузере.',
    en: 'The app is open outside Telegram: mood is stored locally in the browser.',
  },
  taskButton: { ru: 'Начать задачу', en: 'New task' },
  taskButtonActive: { ru: 'Задача', en: 'Task' },
  skins: { ru: 'Скины', en: 'Skins' },
  feed: { ru: 'ПОКОРМИТЬ', en: 'FEED' },
  full: { ru: 'Сыт', en: 'Full' },
  feedCooldown: {
    ru: (time: string) => `Покормить через ${time}`,
    en: (time: string) => `Feed in ${time}`,
  },
  away: {
    ru: (time: string) => `Он ушёл. Вернётся через ${time}`,
    en: (time: string) => `It's away. Back in ${time}`,
  },
  mood: { ru: 'Настроение', en: 'Mood' },
  newTaskTitle: { ru: 'Начать задачу', en: 'New task' },
  hoursLabel: { ru: 'Сколько часов', en: 'Hours' },
  descriptionLabel: { ru: 'Краткое описание', en: 'Short description' },
  descriptionPlaceholder: { ru: 'Что нужно сделать?', en: 'What needs doing?' },
  cancel: { ru: 'Отмена', en: 'Cancel' },
  start: { ru: 'Начать', en: 'Start' },
  taskTitle: { ru: 'Задача', en: 'Task' },
  remaining: {
    ru: (time: string) => `Осталось: ${time}`,
    en: (time: string) => `Left: ${time}`,
  },
  overdue: { ru: 'Просрочено', en: 'Overdue' },
  taskHours: {
    ru: (hours: number) => `Часов: ${hours}`,
    en: (hours: number) => `Hours: ${hours}`,
  },
  taskExtensions: {
    ru: (count: number) => `Продлений: ${count}`,
    en: (count: number) => `Extensions: ${count}`,
  },
  done: { ru: 'Выполнено', en: 'Done' },
  extend: { ru: '+1 час', en: '+1 hour' },
  abandon: { ru: 'Отказаться', en: 'Abandon' },
  abandonConfirm: { ru: 'Точно отказаться?', en: 'Abandon for sure?' },
  close: { ru: 'Закрыть', en: 'Close' },
  lessThanMinute: { ru: 'меньше минуты', en: 'less than a minute' },
  minutes: {
    ru: (count: number) => `${count} мин`,
    en: (count: number) => `${count} min`,
  },
  hoursMinutes: {
    ru: (hours: number, minutes: number) => `${hours} ч ${minutes} мин`,
    en: (hours: number, minutes: number) => `${hours} h ${minutes} min`,
  },
}

export const SKIN_NAMES: Record<SkinId, { ru: string; en: string }> = {
  classic: { ru: 'Классика', en: 'Classic' },
  sky: { ru: 'Небо', en: 'Sky' },
  rose: { ru: 'Роза', en: 'Rose' },
}

export function skinName(id: SkinId): string {
  return m(SKIN_NAMES[id])
}

export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  if (minutes < 1) {
    return m(messages.lessThanMinute)
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return m(messages.minutes)(rest)
  }
  return m(messages.hoursMinutes)(hours, rest)
}
```

- [ ] **Step 2: Remove `formatRemaining` from `src/tamagotchi.ts`**

Delete the whole function at the end of the file:

```ts
export function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  if (minutes < 1) {
    return 'меньше минуты'
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest} мин`
  }
  return `${hours} ч ${rest} мин`
}
```

- [ ] **Step 3: Drop the `name` field from `src/pixel/skins.ts`**

Replace the interface and catalog:

```ts
export interface Skin {
  id: SkinId
  colors: Record<string, string>
}

export const SKINS: Skin[] = [
  {
    id: 'classic',
    colors: { g: '#7ec8a9', l: '#a8dcc0', b: '#f4a3a3', d: '#2f4f43' },
  },
  {
    id: 'sky',
    colors: { g: '#7fa9c9', l: '#a9c9dc', b: '#f4a3a3', d: '#2f4354' },
  },
  {
    id: 'rose',
    colors: { g: '#d98ca6', l: '#ecc0cd', b: '#b5657f', d: '#542f3f' },
  },
]
```

- [ ] **Step 4: Localize `src/components/MoodControls.vue`**

Replace the import:

```ts
import { formatRemaining } from '../tamagotchi'
```

with:

```ts
import { formatRemaining, m, messages } from '../i18n'
```

Replace `feedLabel`:

```ts
const feedLabel = computed(() => {
  if (props.blockReason === 'cooldown' && props.nextFeedMs !== null) {
    return m(messages.feedCooldown)(formatRemaining(props.nextFeedMs))
  }
  if (props.blockReason === 'full') {
    return m(messages.full)
  }
  return m(messages.feed)
})
```

Replace the away paragraph:

```html
    <p v-if="remainingMs !== null" class="away">
      {{ m(messages.away)(formatRemaining(remainingMs)) }}
    </p>
```

- [ ] **Step 5: Localize `src/components/MoodIndicator.vue`**

Add to the script:

```ts
import { m, messages } from '../i18n'
```

Replace both `aria-label="Настроение"` occurrences (the meter div and the
range input) with:

```html
      :aria-label="m(messages.mood)"
```

- [ ] **Step 6: Localize `src/components/TaskCreateDialog.vue`**

Add to the script:

```ts
import { m, messages } from '../i18n'
```

Replace the template body:

```html
  <Modal :title="m(messages.newTaskTitle)" @close="emit('close')">
    <label class="field">
      <span>{{ m(messages.hoursLabel) }}</span>
      <input v-model.number="hours" type="number" :min="TASK_MIN_HOURS" :max="TASK_MAX_HOURS" step="1" />
    </label>
    <label class="field">
      <span>{{ m(messages.descriptionLabel) }}</span>
      <input
        v-model="description"
        type="text"
        :maxlength="TASK_DESCRIPTION_MAX"
        :placeholder="m(messages.descriptionPlaceholder)"
      />
    </label>
    <div class="actions">
      <button class="secondary" type="button" @click="emit('close')">{{ m(messages.cancel) }}</button>
      <button class="primary" type="button" :disabled="!valid" @click="submit">{{ m(messages.start) }}</button>
    </div>
  </Modal>
```

- [ ] **Step 7: Localize `src/components/TaskInfoDialog.vue`**

Replace the imports:

```ts
import { formatRemaining, type TamagotchiTask } from '../tamagotchi'
```

with:

```ts
import type { TamagotchiTask } from '../tamagotchi'
import { formatRemaining, m, messages } from '../i18n'
```

Replace `remainingLabel`:

```ts
const remainingLabel = computed(() =>
  remaining.value > 0
    ? m(messages.remaining)(formatRemaining(remaining.value))
    : m(messages.overdue),
)
```

Replace the template body:

```html
  <Modal :title="m(messages.taskTitle)" @close="emit('close')">
    <p class="description">{{ task.description }}</p>
    <p class="row">{{ m(messages.taskHours)(task.hours) }}</p>
    <p class="row">{{ remainingLabel }}</p>
    <p v-if="task.extensions > 0" class="row">{{ m(messages.taskExtensions)(task.extensions) }}</p>
    <div class="actions">
      <button class="primary" type="button" @click="emit('complete')">{{ m(messages.done) }}</button>
      <button class="secondary" type="button" @click="emit('extend')">{{ m(messages.extend) }}</button>
      <button class="danger" type="button" @click="handleAbandon">
        {{ confirming ? m(messages.abandonConfirm) : m(messages.abandon) }}
      </button>
      <button class="secondary" type="button" @click="emit('close')">{{ m(messages.close) }}</button>
    </div>
  </Modal>
```

- [ ] **Step 8: Localize `src/components/SkinDialog.vue`**

Add to the script:

```ts
import { m, messages, skinName } from '../i18n'
```

Replace the `Modal` title and the name span:

```html
  <Modal :title="m(messages.skins)" @close="emit('close')">
```

```html
        <span class="name">{{ skinName(skin.id) }}</span>
```

- [ ] **Step 9: Localize `src/App.vue`**

Add to the imports:

```ts
import { m, messages } from './i18n'
```

Replace the banner text:

```html
    <div v-if="!inTelegram" class="banner">
      {{ m(messages.banner) }}
    </div>
```

Replace the MainButton text in `watchEffect`:

```ts
  webApp.MainButton.setText(m(task.value === null ? messages.taskButton : messages.taskButtonActive))
```

Replace the SecondaryButton text:

```ts
      webApp.SecondaryButton.setText(m(messages.skins))
```

Replace the task button label and the skins button label in the action row:

```html
          {{ task === null ? m(messages.taskButton) : m(messages.taskButtonActive) }}
```

```html
        <button class="task-button" type="button" @click="skinOpen = true">{{ m(messages.skins) }}</button>
```

- [ ] **Step 10: Update `README.MD`**

Add after the skins paragraph:

```markdown
Интерфейс двуязычный: русский и английский. Язык определяется по Telegram
(`language_code`), в браузере — по `navigator.language`; все остальные языки
получают английский.
```

Add to the structure list after the `src/phrases.ts` line:

```markdown
- `src/i18n.ts` — определение языка и каталог строк (ru/en)
```

- [ ] **Step 11: Verify and commit**

`npm run typecheck` and `npm run build` → exit 0.

Browser checks (`npm run dev`): with the browser language Russian the interface
is Russian; with English (`--lang=en-US`) all buttons, dialogs and the away
message are English; no Russian strings remain in the UI.

```bash
git add src/i18n.ts src/tamagotchi.ts src/pixel/skins.ts src/components/MoodControls.vue src/components/MoodIndicator.vue src/components/TaskCreateDialog.vue src/components/TaskInfoDialog.vue src/components/SkinDialog.vue src/App.vue README.MD
git commit -m "Add the i18n catalog and localize the interface"
```

---

### Task 2: Bilingual character phrases

**Files:**
- Modify: `src/phrases.ts`

**Interfaces:**
- Consumes: `locale`, `Locale` from `src/i18n.ts`.
- Produces: `PHRASES: Record<PhraseEvent, Record<Locale, string[]>>`;
  `pickPhrase(event: PhraseEvent): string` unchanged in signature.

- [ ] **Step 1: Rewrite `src/phrases.ts`**

```ts
import { locale, type Locale } from './i18n'

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

export const PHRASES: Record<PhraseEvent, Record<Locale, string[]>> = {
  greeting: {
    ru: ['Привет! Как дела?', 'Я скучал!', 'Чем займёмся?'],
    en: ['Hi! How are you?', 'I missed you!', 'What shall we do?'],
  },
  feed: {
    ru: ['Ням-ням! Спасибо!', 'Вкусно!', 'Ещё бы чуть-чуть!'],
    en: ['Yum-yum! Thank you!', 'Delicious!', 'A little more would be nice!'],
  },
  feedAtCap: {
    ru: ['Спасибо, я сыт!', 'Мне больше не влезет', 'Я и так доволен!'],
    en: ["Thanks, I'm full!", "I can't eat another bite", "I'm happy as is!"],
  },
  feedCooldown: {
    ru: ['Я ещё не проголодался', 'Давай попозже', 'Я сегодня уже ел'],
    en: ["I'm not hungry yet", 'Maybe later', 'I already ate today'],
  },
  taskStart: {
    ru: ['Ого, задача! Я помогу!', 'Берусь!', 'Звучит серьёзно!'],
    en: ['Whoa, a task! I will help!', "I'm on it!", 'Sounds serious!'],
  },
  taskComplete: {
    ru: ['Ура, всё готово!', 'Мы справились!', 'Отличная работа!'],
    en: ['Hooray, all done!', 'We did it!', 'Great job!'],
  },
  taskExtend: {
    ru: ['Ещё часик? Ладно...', 'Хорошо, но я буду быстрее уставать', 'Время летит...'],
    en: ['One more hour? Fine...', "Okay, but I'll get tired faster", 'Time flies...'],
  },
  taskAbandon: {
    ru: ['Эх... ладно', 'Ну вот...', 'Обидно'],
    en: ['Oh well... fine', 'Aw man...', "That's a shame"],
  },
  overdue: {
    ru: ['Время вышло... я расстроен', 'Ты обещал успеть...', 'Задача просрочена...'],
    en: ["Time's up... I'm sad", 'You promised to make it...', 'The task is overdue...'],
  },
  awayStart: {
    ru: ['Я ухожу...', 'Мне грустно...', 'Оставь меня ненадолго'],
    en: ["I'm leaving...", 'I feel sad...', 'Leave me alone for a while'],
  },
  returned: {
    ru: ['Я вернулся!', 'Скучал по тебе', 'Ну что, продолжим?'],
    en: ["I'm back!", 'I missed you', 'So, shall we continue?'],
  },
}

const lastPicks = new Map<PhraseEvent, string>()

export function pickPhrase(event: PhraseEvent): string {
  const options = PHRASES[event][locale]
  const previous = lastPicks.get(event)
  const candidates = options.length > 1 ? options.filter((phrase) => phrase !== previous) : options
  const phrase = candidates[Math.floor(Math.random() * candidates.length)]
  lastPicks.set(event, phrase)
  return phrase
}
```

- [ ] **Step 2: Verify and commit**

`npm run typecheck` and `npm run build` → exit 0.

Browser checks (`npm run dev`): with `--lang=en-US` the character phrases are
English; with Russian they stay Russian; switching mood/feed/tasks triggers
the right language.

```bash
git add src/phrases.ts
git commit -m "Make the character phrases bilingual"
```

---

### Task 3: Rules onboarding and button

**Files:**
- Create: `src/components/RulesDialog.vue`
- Modify: `src/i18n.ts`, `src/tamagotchi.ts`, `src/storage.ts`, `src/App.vue`,
  `README.MD`

**Interfaces:**
- Consumes: `m`, `messages`, `locale` from Task 1.
- Produces:
  - `TamagotchiState` gains `rulesSeen: boolean`.
  - `RulesDialog.vue` with emits `{ close: [] }`.
  - App-level `rulesOpen`, `handleRulesClose`, always-rendered action row.

- [ ] **Step 1: Add the rules strings to `src/i18n.ts`**

Add to the `messages` catalog (before the closing `}`):

```ts
  rules: { ru: 'Правила', en: 'Rules' },
  gotIt: { ru: 'Понятно', en: 'Got it' },
  rulesBullets: {
    ru: [
      'Настроение падает само: −20 в час.',
      '«Покормить» — раз в 24 часа: +20, но не выше 20.',
      'Задача сразу поднимает настроение (20 + 10 за каждый час), но пока она идёт, настроение падает быстрее.',
      '«Выполнено» — настроение остаётся; «Отказаться» или просрочка — падает до 0.',
      'На нуле персонаж отворачивается, при −100 уходит и вернётся через 2 часа.',
      'Полоску настроения можно перетаскивать, чтобы посмотреть состояния.',
      'Скины меняют палитру персонажа.',
    ],
    en: [
      'Mood drops by itself: −20 per hour.',
      '"Feed" once every 24 hours: +20, but not above 20.',
      'A task raises mood at once (20 + 10 per hour), but while it runs mood drops faster.',
      '"Done" keeps the mood; "Abandon" or an overdue task drops it to 0.',
      'At zero the pet turns away; at −100 it leaves and comes back in 2 hours.',
      'Drag the mood bar to preview the states.',
      'Skins change the pet palette.',
    ],
  },
```

- [ ] **Step 2: Add `rulesSeen` to `src/tamagotchi.ts`**

Add the field to the interface:

```ts
export interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
  task: TamagotchiTask | null
  skin: SkinId
  rulesSeen: boolean
}
```

Add `rulesSeen: false` to `createInitialState`, and `rulesSeen: state.rulesSeen`
to every literal state return in `applyDecay` (four branches), `feed` and
`startTask` (the same six objects that already carry `skin`).

- [ ] **Step 3: Normalize `rulesSeen` in `src/storage.ts`**

In `isValidState` add:

```ts
  const rulesSeenOk = candidate.rulesSeen === undefined || typeof candidate.rulesSeen === 'boolean'
```

and include it in the final return:

```ts
  return moodOk && lastSeenOk && awayOk && lastFedOk && taskOk && rulesSeenOk
```

In `normalizeState` add:

```ts
    rulesSeen: state.rulesSeen === true,
```

- [ ] **Step 4: Create `src/components/RulesDialog.vue`**

```vue
<script setup lang="ts">
import Modal from './Modal.vue'
import { m, messages } from '../i18n'

const emit = defineEmits<{ close: [] }>()
const bullets = m(messages.rulesBullets)
</script>

<template>
  <Modal :title="m(messages.rules)" @close="emit('close')">
    <ul class="rules">
      <li v-for="(line, index) in bullets" :key="index">{{ line }}</li>
    </ul>
    <button class="done" type="button" @click="emit('close')">{{ m(messages.gotIt) }}</button>
  </Modal>
</template>

<style scoped>
.rules {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.35;
}

.done {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 15px;
  cursor: pointer;
}
</style>
```

- [ ] **Step 5: Wire the rules into `src/App.vue`**

Add the import:

```ts
import RulesDialog from './components/RulesDialog.vue'
```

Add the state next to `skinOpen`:

```ts
const rulesOpen = ref(false)
```

Add the auto-show watcher next to the other watchers:

```ts
watch(
  [ready, () => current.value.rulesSeen],
  ([isReady, seen]) => {
    if (isReady && !seen) {
      rulesOpen.value = true
    }
  },
)
```

Add the close handler next to `handleSkinButton`:

```ts
function handleRulesClose(): void {
  rulesOpen.value = false
  if (!current.value.rulesSeen) {
    now.value = Date.now()
    state.value = { ...current.value, rulesSeen: true, lastSeen: now.value }
    void saveState(state.value)
  }
}
```

Replace the action row so it always renders and carries the rules button:

```html
      <div class="task-actions">
        <button
          v-if="!inTelegram"
          class="task-button"
          type="button"
          @click="task === null ? (createOpen = true) : (infoOpen = true)"
        >
          {{ task === null ? m(messages.taskButton) : m(messages.taskButtonActive) }}
        </button>
        <button
          v-if="!hasSecondaryButton"
          class="task-button"
          type="button"
          @click="skinOpen = true"
        >
          {{ m(messages.skins) }}
        </button>
        <button class="task-button" type="button" @click="rulesOpen = true">
          {{ m(messages.rules) }}
        </button>
      </div>
```

Add the dialog next to the other dialogs:

```html
    <RulesDialog v-if="rulesOpen" @close="handleRulesClose" />
```

- [ ] **Step 6: Update `README.MD`**

Add after the localization paragraph:

```markdown
При первом запуске показывается окно с правилами; открыть его снова можно
кнопкой «Правила» в нижнем ряду.
```

Add to the structure list after the `src/components/SkinDialog.vue` line:

```markdown
- `src/components/RulesDialog.vue` — правила игры при первом запуске и по кнопке
```

- [ ] **Step 7: Verify and commit**

`npm run typecheck` and `npm run build` → exit 0.

Browser checks (`npm run dev`): on the first launch (state without `rulesSeen`)
the rules dialog opens by itself; closing it and reloading does not show it
again; the «Правила» button reopens it; the bottom row shows the task, skins
and rules buttons in browser mode; the dialog is English with `--lang=en-US`.

```bash
git add src/i18n.ts src/tamagotchi.ts src/storage.ts src/components/RulesDialog.vue src/App.vue README.MD
git commit -m "Show the rules on first launch and from a button"
```

---

## Self-review notes

- Spec coverage: locale detection and catalog (Task 1), bilingual phrases
  (Task 2), rules state/UI/docs (Task 3).
- `formatRemaining` moves to `i18n.ts`; both consumers (`MoodControls`,
  `TaskInfoDialog`) are updated in Task 1.
- `rulesSeen` follows the same six state literals and the storage
  normalization pattern as `skin`.
- The action row is now always rendered: task button only outside Telegram,
  skins button only without a native SecondaryButton, rules button always.
