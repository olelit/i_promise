# AGENTS.md

## Project

Tamagotchi Telegram Mini App: Vue 3 + Vite + TypeScript; the only backend is
the Vercel functions that send the rules and answer the `/rule` command. A
single
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
- The game world (room, character, mood bar, speech bubble) uses the fixed
  pixel palette from `src/pixel/palette.ts`; pixel maps live in `src/pixel/`
  and render to SVG with `shape-rendering: crispEdges`.
- Native chrome (feed button, task dialogs, browser banner, Telegram
  MainButton) uses only the Telegram theme CSS custom properties
  (`--tg-bg`, `--tg-text`, `--tg-hint`, `--tg-button`, `--tg-button-text`,
  `--tg-secondary-bg`) defined in `src/App.vue`.
- Game logic lives in `src/tamagotchi.ts` as pure functions; components stay
  presentational.
- No backend except the Vercel Edge Functions `api/rules.ts` (verifies
  `initData` and sends the one-time rules message) and `api/webhook.ts`
  (answers `/rule`, `/rules` and `/start`); no other network calls. The bot
  token and the webhook secret live only in the `BOT_TOKEN` and
  `WEBHOOK_SECRET` environment variables on Vercel. Outside Telegram the app
  runs in browser mode (localStorage + dev controls).
