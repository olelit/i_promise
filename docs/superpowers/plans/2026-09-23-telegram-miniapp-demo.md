# Telegram Mini App Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Vue 3 + TypeScript Telegram Mini App demo (user data, theming, MainButton, BackButton, haptics) that can be loaded into a Telegram bot as static files.

**Architecture:** A single-page Vite app. The official `telegram-web-app.js` script is loaded in `index.html`; `src/telegram.ts` is the single typed entry point to `window.Telegram.WebApp` (with an `isTelegram()` helper that distinguishes a real Telegram client from a plain browser, where the script still defines `WebApp`). `App.vue` owns startup calls (`ready()`, `expand()`) and theme CSS custom properties; two presentational components render user data and controls.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript 5.9, vue-tsc 3.3, official Telegram WebApp script (no npm SDK).

## Global Constraints

- Commit messages MUST be written in English only.
- Telegram API is loaded via the script tag in `index.html`; never add a Telegram npm SDK (`@tma.js/*`, `@telegram-apps/*`).
- All access to the Telegram API goes through `src/telegram.ts`; nothing else touches `window.Telegram`.
- No backend, no network requests; the app must work in a plain browser (banner + mock data).
- Vue SFCs use `<script setup lang="ts">`; TypeScript strict mode is on.
- Colors in components come only from Telegram theme CSS custom properties (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`, `--tg-secondary-bg`) defined in `App.vue`.
- Verification for every task: `npm run typecheck` and `npm run build` pass.

---

### Task 1: Project scaffold and AGENTS.md

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/vite-env.d.ts`
- Create: `.gitignore`
- Create: `AGENTS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: npm scripts `dev`, `build`, `preview`, `typecheck`; `#app` mount point in `index.html`; the Telegram script tag that makes `window.Telegram.WebApp` available before the bundle runs.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "i-promise",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit"
  },
  "dependencies": {
    "vue": "^3.5.43"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.9",
    "typescript": "~5.9.3",
    "vite": "^8.3.0",
    "vue-tsc": "^3.3.11"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "useDefineForClassFields": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
})
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Mini App Demo</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 6: Create `src/App.vue` (placeholder, replaced in Task 3)**

```vue
<template>
  <main>Telegram Mini App demo</main>
</template>
```

- [ ] **Step 7: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 9: Create `AGENTS.md`**

```markdown
# AGENTS.md

## Project

Telegram Mini App demo: Vue 3 + Vite + TypeScript, no backend.

The Telegram WebApp API is loaded via the script tag in `index.html`
(https://telegram.org/js/telegram-web-app.js) — do NOT add it as an npm
dependency. All Telegram API access must go through `src/telegram.ts`.

## Commits

- Commit messages MUST be written in English only.
- Keep commits small and focused; one logical change per commit.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build to `dist/`
- `npm run typecheck` — run `vue-tsc --noEmit`
- `npm run preview` — preview the production build

## Conventions

- Vue 3 SFCs with `<script setup lang="ts">`.
- Colors in components come only from the Telegram theme CSS custom
  properties (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`,
  `--tg-button-text`, `--tg-secondary-bg`) defined in `src/App.vue`.
- No backend or network calls; the app must work when opened outside
  Telegram (shows a banner and mock data).
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` written, no errors.

- [ ] **Step 11: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0 with no output.

Run: `npm run build`
Expected: exits 0; `dist/index.html` and `dist/assets/*.js` created.

- [ ] **Step 12: Verify dev server serves the app**

Run (background): `npm run dev`
Then: `curl -s http://localhost:5173/ | grep 'id="app"'`
Expected: the `<div id="app">` line is printed.
Stop the dev server afterwards.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/App.vue src/vite-env.d.ts .gitignore AGENTS.md
git commit -m "Set up Vite + Vue 3 + TypeScript scaffold and AGENTS.md"
```

---

### Task 2: Typed Telegram accessor (`src/telegram.ts`)

**Files:**
- Create: `src/telegram.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `getWebApp(): TelegramWebApp | undefined` — raw accessor. The official script defines `window.Telegram.WebApp` even in a plain browser (platform `unknown`, empty `initData`), so a defined `WebApp` does NOT by itself mean "inside Telegram".
  - `isTelegram(): boolean` — true only in a real Telegram client (non-empty `initData` or known `platform`).
  - `mockUser: TelegramWebAppUser` — mock data for browser development.
  - Types: `TelegramWebApp`, `TelegramWebAppUser`, `TelegramThemeParams`, `TelegramMainButton`, `TelegramBackButton`, `TelegramHapticFeedback`.

- [ ] **Step 1: Create `src/telegram.ts`**

```ts
export interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

export interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
}

export interface TelegramMainButton {
  text: string
  isVisible: boolean
  show(): void
  hide(): void
  setText(text: string): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  onClick(handler: () => void): void
  offClick(handler: () => void): void
}

export interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(handler: () => void): void
  offClick(handler: () => void): void
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramWebAppUser
    query_id?: string
    auth_date?: number
    hash?: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  viewportHeight: number
  viewportStableHeight: number
  isExpanded: boolean
  version: string
  platform: string
  ready(): void
  expand(): void
  close(): void
  onEvent(event: string, handler: () => void): void
  offEvent(event: string, handler: () => void): void
  MainButton: TelegramMainButton
  BackButton: TelegramBackButton
  HapticFeedback: TelegramHapticFeedback
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export const mockUser: TelegramWebAppUser = {
  id: 1,
  first_name: 'Test',
  last_name: 'User',
  username: 'test_user',
  language_code: 'en',
  is_premium: false,
}

export function getWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}

export function isTelegram(): boolean {
  const webApp = getWebApp()
  return webApp !== undefined && (webApp.initData !== '' || webApp.platform !== 'unknown')
}
```

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/telegram.ts
git commit -m "Add typed Telegram WebApp accessor"
```

---

### Task 3: App shell — startup, theming, browser banner

**Files:**
- Modify: `src/App.vue` (full rewrite of the Task 1 placeholder)
- Modify: `src/telegram.ts` (add the `isTelegram()` helper)

**Interfaces:**
- Consumes: `getWebApp()`, `isTelegram()`, `mockUser`, types `TelegramWebAppUser`, `TelegramThemeParams` from `src/telegram.ts` (Task 2).
- Produces: CSS custom properties on the app root (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`, `--tg-secondary-bg`) that all components use; the app layout that Task 4/5 components are inserted into.

- [ ] **Step 1: Add `isTelegram()` to `src/telegram.ts`**

Append after `getWebApp`:

```ts
export function isTelegram(): boolean {
  const webApp = getWebApp()
  return webApp !== undefined && (webApp.initData !== '' || webApp.platform !== 'unknown')
}
```

- [ ] **Step 2: Replace `src/App.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getWebApp, isTelegram, mockUser, type TelegramThemeParams } from './telegram'

const webApp = getWebApp()
const inTelegram = isTelegram()
const user = webApp?.initDataUnsafe.user ?? mockUser
const theme = ref<TelegramThemeParams>({})

function applyTheme(): void {
  theme.value = { ...(webApp?.themeParams ?? {}) }
}

const themeStyle = computed(() => ({
  '--tg-bg': theme.value.bg_color ?? '#ffffff',
  '--tg-text': theme.value.text_color ?? '#000000',
  '--tg-hint': theme.value.hint_color ?? '#707579',
  '--tg-button': theme.value.button_color ?? '#2481cc',
  '--tg-button-text': theme.value.button_text_color ?? '#ffffff',
  '--tg-secondary-bg': theme.value.secondary_bg_color ?? '#f4f4f5',
}))

onMounted(() => {
  if (!webApp) {
    return
  }
  webApp.ready()
  webApp.expand()
  applyTheme()
  webApp.onEvent('themeChanged', applyTheme)
})

onUnmounted(() => {
  webApp?.offEvent('themeChanged', applyTheme)
})
</script>

<template>
  <div class="app" :style="themeStyle">
    <div v-if="!inTelegram" class="banner">
      Приложение открыто не в Telegram: показаны тестовые данные. Чтобы увидеть
      реальные данные пользователя, открой мини-приложение из бота.
    </div>
    <main class="content">
      <h1 class="title">Telegram Mini App Demo</h1>
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--tg-bg);
  color: var(--tg-text);
}

.banner {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--tg-secondary-bg);
  color: var(--tg-hint);
  font-size: 14px;
  line-height: 1.4;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 20px;
}
</style>
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Verify in browser**

Run (background): `npm run dev`
Then: `curl -s http://localhost:5173/ | grep 'telegram-web-app.js'`
Expected: the script tag line is printed.
Open `http://localhost:5173/` in a browser: the banner about "не в Telegram" and the title are visible on a white background (the banner must render even though the Telegram script loaded successfully — `isTelegram()` is false because `initData` is empty and `platform` is `unknown`).
Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "Add app shell with Telegram startup, theming and browser banner"
```

---

### Task 4: UserCard component

**Files:**
- Create: `src/components/UserCard.vue`
- Modify: `src/App.vue` (import and render `UserCard`, remove the `title` heading)

**Interfaces:**
- Consumes: type `TelegramWebAppUser` from `src/telegram.ts` (Task 2); `user` value from `App.vue` (Task 3).
- Produces: `UserCard` component with a single required prop `user: TelegramWebAppUser`.

- [ ] **Step 1: Create `src/components/UserCard.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { TelegramWebAppUser } from '../telegram'

const props = defineProps<{ user: TelegramWebAppUser }>()

const fullName = computed(() => {
  const parts = [props.user.first_name, props.user.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Без имени'
})

const initials = computed(() => fullName.value.slice(0, 1).toUpperCase())
</script>

<template>
  <section class="card">
    <img v-if="user.photo_url" class="avatar" :src="user.photo_url" :alt="fullName" />
    <div v-else class="avatar avatar--placeholder">{{ initials }}</div>
    <div class="info">
      <h2 class="name">
        {{ fullName }}
        <span v-if="user.is_premium" class="badge">premium</span>
      </h2>
      <p v-if="user.username" class="row">@{{ user.username }}</p>
      <p class="row">id: {{ user.id }}</p>
      <p v-if="user.language_code" class="row">lang: {{ user.language_code }}</p>
    </div>
  </section>
</template>

<style scoped>
.card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: var(--tg-secondary-bg);
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 28px;
  font-weight: 600;
}

.info {
  min-width: 0;
}

.name {
  margin: 0 0 4px;
  font-size: 18px;
  overflow-wrap: anywhere;
}

.badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 11px;
  vertical-align: middle;
}

.row {
  margin: 0;
  color: var(--tg-hint);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>
```

- [ ] **Step 2: Wire `UserCard` into `src/App.vue`**

In the `<script setup>` block, add the import after the `telegram` import:

```ts
import UserCard from './components/UserCard.vue'
```

In the `<template>`, replace:

```html
    <main class="content">
      <h1 class="title">Telegram Mini App Demo</h1>
    </main>
```

with:

```html
    <main class="content">
      <UserCard :user="user" />
    </main>
```

In the scoped `<style>` block, delete the now-unused `.title` rule.

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Verify in browser**

Run (background): `npm run dev`
Open `http://localhost:5173/`: mock user "Test User", `@test_user`, `id: 1`, `lang: en` are visible in a card.
Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/components/UserCard.vue src/App.vue
git commit -m "Add UserCard component with mock user fallback"
```

---

### Task 5: DemoControls component (MainButton, BackButton, haptics)

**Files:**
- Create: `src/components/DemoControls.vue`
- Modify: `src/App.vue` (import and render `DemoControls`)

**Interfaces:**
- Consumes: `getWebApp()`, `isTelegram()` from `src/telegram.ts` (Tasks 2-3).
- Produces: `DemoControls` component with no props; owns the tap counter and all MainButton/BackButton/haptic side effects.

- [ ] **Step 1: Create `src/components/DemoControls.vue`**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { getWebApp, isTelegram } from '../telegram'

const webApp = getWebApp()
const inTelegram = isTelegram()
const count = ref(0)

function increment(): void {
  count.value += 1
  webApp?.HapticFeedback.impactOccurred('light')
}

function reset(): void {
  count.value = 0
}

function syncBackButton(): void {
  if (!webApp) {
    return
  }
  if (count.value > 0) {
    webApp.BackButton.show()
  } else {
    webApp.BackButton.hide()
  }
}

watch(count, syncBackButton)

onMounted(() => {
  if (!webApp) {
    return
  }
  webApp.MainButton.setText('Нажми меня')
  webApp.MainButton.onClick(increment)
  webApp.MainButton.show()
  webApp.BackButton.onClick(reset)
})

onUnmounted(() => {
  if (!webApp) {
    return
  }
  webApp.MainButton.offClick(increment)
  webApp.MainButton.hide()
  webApp.BackButton.offClick(reset)
  webApp.BackButton.hide()
})
</script>

<template>
  <section class="controls">
    <p class="count">Нажатий: <strong>{{ count }}</strong></p>
    <p class="hint">
      В Telegram кнопка «Нажми меня» — это MainButton внизу экрана, нажатие даёт
      haptic feedback. BackButton появляется, когда счётчик больше нуля, и
      сбрасывает его.
    </p>
    <button v-if="!inTelegram" class="fallback" type="button" @click="increment">
      Нажми меня (браузерный режим)
    </button>
  </section>
</template>

<style scoped>
.controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.count {
  margin: 0;
  font-size: 18px;
}

.hint {
  margin: 0;
  color: var(--tg-hint);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.fallback {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: Wire `DemoControls` into `src/App.vue`**

In the `<script setup>` block, add after the `UserCard` import:

```ts
import DemoControls from './components/DemoControls.vue'
```

In the `<template>`, replace:

```html
    <main class="content">
      <UserCard :user="user" />
    </main>
```

with:

```html
    <main class="content">
      <UserCard :user="user" />
      <DemoControls />
    </main>
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Verify in browser**

Run (background): `npm run dev`
Open `http://localhost:5173/`: clicking "Нажми меня (браузерный режим)" increments "Нажатий" and no console errors appear.
Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/components/DemoControls.vue src/App.vue
git commit -m "Add DemoControls with MainButton, BackButton and haptics"
```

---

### Task 6: README with bot setup instructions

**Files:**
- Modify: `README.MD` (currently empty)

**Interfaces:**
- Consumes: everything built in Tasks 1-5.
- Produces: user-facing documentation; no code interfaces.

- [ ] **Step 1: Write `README.MD`**

```markdown
# i_promise — Telegram Mini App Demo

Минимальное демо Telegram Mini App на Vue 3 + Vite + TypeScript.
Показывает данные пользователя, тему Telegram, MainButton, BackButton и
haptic feedback. Бэкенда нет — только статика.

## Требования

- Node.js 20.19+ или 22.12+

## Команды

- `npm install` — установить зависимости
- `npm run dev` — dev-сервер на http://localhost:5173
- `npm run typecheck` — проверка типов (`vue-tsc --noEmit`)
- `npm run build` — проверка типов и сборка в `dist/`
- `npm run preview` — локальный просмотр собранной версии

В обычном браузере приложение открывается с баннером и тестовыми данными —
это нормально, реальные данные приходят только из Telegram.

## Как подключить к боту

1. Собери и выложи приложение на любой HTTPS-хостинг
   (GitHub Pages, Vercel, Netlify, ...):

   ```bash
   npm run build
   # залей содержимое dist/ на хостинг
   ```

2. Укажи URL в BotFather:
   - `/newapp` — создать Mini App и указать URL; или
   - `/mybots` → выбрать бота → Bot Settings → Menu Button → указать URL
     (или команда `/setmenubutton`).

3. Открой бота в Telegram и нажми кнопку меню — приложение загрузится
   внутри Telegram с реальными данными пользователя.

### Хостинг в подкаталоге

Если приложение лежит не в корне домена (например, GitHub Pages
`https://user.github.io/repo/`), укажи путь в `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [vue()],
  base: '/repo/',
})
```

и пересобери проект.

## Структура

- `index.html` — подключает официальный скрипт
  `https://telegram.org/js/telegram-web-app.js`
- `src/telegram.ts` — типы и безопасный доступ к `window.Telegram.WebApp`
- `src/App.vue` — запуск (`ready()`, `expand()`), тема, баннер вне Telegram
- `src/components/UserCard.vue` — данные пользователя
- `src/components/DemoControls.vue` — MainButton, BackButton, haptics

## Полезные ссылки

- Документация Mini Apps: https://docs.telegram-mini-apps.com/
- Официальная документация Telegram: https://core.telegram.org/bots/webapps
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add README.MD
git commit -m "Document setup, build and bot connection in README"
```

---

## Manual end-to-end check (after all tasks)

1. `npm run build`
2. Serve `dist/` over HTTPS (any static host).
3. In BotFather set the URL as the bot's Menu Button.
4. Open the bot in Telegram, tap the menu button:
   - User card shows the real name, `@username`, id and language.
   - Colors match the current Telegram theme (check light and dark).
   - MainButton "Нажми меня" is visible at the bottom; tapping increments the
     counter with a light haptic tick.
   - BackButton appears while the counter is above zero and resets it.
