# AGENTS.md

## Project

Tamagotchi Telegram Mini App: Vue 3 + Vite + TypeScript, no backend. A single
parameter — mood (see README for mechanics).

The Telegram WebApp API is loaded via the script tag in `index.html`
(https://telegram.org/js/telegram-web-app.js) — do NOT add it as an npm
dependency. All Telegram API access must go through `src/telegram.ts`.
All persistence must go through `src/storage.ts`.

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
- UI chrome colors come only from the Telegram theme CSS custom properties
  (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`,
  `--tg-secondary-bg`) defined in `src/App.vue`. The character palette in
  `Tamagotchi.vue` is intentionally fixed.
- Game logic lives in `src/tamagotchi.ts` as pure functions; components stay
  presentational.
- The 3D character uses `three`, imported only by `src/three/character.ts` and
  `src/components/Tamagotchi3D.vue`; the component is lazily loaded and must
  fall back to the SVG `Tamagotchi.vue` when WebGL is unavailable.
- No backend or network calls; outside Telegram the app runs in browser mode
  (localStorage + dev controls).
