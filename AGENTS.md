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
