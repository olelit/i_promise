# Telegram Mini App Demo — Design

Date: 2026-09-23
Status: Approved

## Goal

A minimal, working Telegram Mini App demo built with Vue 3, intended as a learning
project and as something that can be loaded into a Telegram bot immediately.
The demo covers the Telegram WebApp APIs that real applications use most often:
user data, theming, MainButton, BackButton, and haptic feedback.

## Non-goals

- No backend, no network requests, no initData validation on a server.
- No tests (a learning demo; verification is typecheck + production build).
- No routing, state management library, or UI kit.
- No npm wrapper/SDK for Telegram (e.g. `@tma.js/sdk`) — the raw official API is used.

## Stack

- Vue 3 with `<script setup>` SFCs.
- Vite as dev server and bundler.
- TypeScript (strict) with `vue-tsc` for type checking.
- Telegram integration via the official script
  `https://telegram.org/js/telegram-web-app.js` included in `index.html`.
  No npm dependency for it.

## Project structure

```
AGENTS.md              # agent instructions: commits only in English, commands, stack
README.MD              # how to run, build, and connect the app to a bot via BotFather
index.html             # loads telegram-web-app.js before the app bundle
package.json
tsconfig.json
vite.config.ts
src/
  main.ts              # creates and mounts the Vue app
  App.vue              # layout; calls ready()/expand(); theme handling; browser banner
  telegram.ts          # types for window.Telegram.WebApp; safe access helpers
  components/
    UserCard.vue       # avatar, name, @username, id, language, premium from initDataUnsafe
    DemoControls.vue   # MainButton (tap counter), BackButton (reset), haptic feedback
```

## Behavior

### Startup

- `src/telegram.ts` exports a typed accessor for `window.Telegram.WebApp` that
  returns `undefined` when the page is opened outside Telegram.
- `App.vue` on mount, when inside Telegram: calls `ready()` and `expand()`.
- When outside Telegram: renders a dismissible banner explaining that the app
  must be opened from Telegram, and uses mock user data so the UI can be
  developed in a normal browser.

### Theming

- On mount, read `themeParams` and apply the values as CSS custom properties
  (`--tg-bg`, `--tg-text`, `--tg-button`, ...) on the root element.
- Subscribe to `themeChanged` and update the custom properties on each event.
- Components use only these custom properties for colors, so the app looks
  native in light and dark themes.

### User data

- `UserCard.vue` renders `initDataUnsafe.user`: `photo_url` (fallback: initials
  placeholder), `first_name`, `last_name`, `username`, `id`, `language_code`,
  and a premium badge when `is_premium` is true.
- If `user` is absent (older clients or missing data), fallback values are shown
  and no error is raised.

### Controls

- `MainButton`: shown on mount with text "Tap me"; each tap increments a counter
  displayed in the page and calls `hapticFeedback.impactOccurred()`. Hidden on
  unmount.
- `BackButton`: visible while the counter is greater than zero; tapping resets
  the counter to zero. Hidden otherwise and on unmount.

## Error handling and edge cases

- All Telegram API access goes through the safe accessor; nothing throws when
  the script is missing or `initDataUnsafe` is empty.
- No network calls, so no request error handling is required.
- `viewportChanged` is not handled specially; the layout is a simple centered
  column that fits any viewport.

## Verification

- `npm run typecheck` (`vue-tsc --noEmit`) passes.
- `npm run build` succeeds.
- Manual check: `npm run dev`, open in a browser (banner + mock data), then load
  the built `dist/` over HTTPS in a bot and confirm user data, theme, MainButton,
  and haptics work.

## Deployment

- `npm run build` produces `dist/`; upload it to any static HTTPS host
  (GitHub Pages, Vercel, Netlify, ...).
- README documents BotFather setup: `/newapp` or Bot Settings → Menu Button →
  set the HTTPS URL of the deployed app.
- README notes the `base` option in `vite.config.ts` for hosting under a
  subpath (e.g. GitHub Pages project pages).

## AGENTS.md

- Rule: commits must be written in English only.
- Stack description and key commands (`npm run dev`, `npm run build`,
  `npm run typecheck`).
- Note that the Telegram API is loaded via script tag, not an npm package, and
  that `src/telegram.ts` is the single entry point for Telegram API access.
