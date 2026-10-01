# Tamagotchi: Rules Onboarding and Button — Design

Date: 2026-10-01
Status: Approved

Stage 13.

## Goal

Explain the game rules to a new player: show a rules dialog once on the first
launch, and keep a «Правила» button in the bottom action row for later.

## 1. State

- `TamagotchiState` gains `rulesSeen: boolean`; `createInitialState` returns
  `false`.
- `storage.ts`: a missing `rulesSeen` normalizes to `false` (old saves show the
  rules once); the field persists through CloudStorage like the rest of the
  state.
- The flag is written when the dialog closes (auto-shown or opened by the
  button — both are harmless).

## 2. UI

- New `RulesDialog.vue` built on `Modal.vue`: the title «Правила», a bullet
  list of the rules, and a «Понятно» button that emits `close`.
- Bottom action row (always rendered):
  - Browser mode: «Начать задачу», «Скины», «Правила».
  - Telegram with `SecondaryButton`: native «Скины» plus the in-app «Правила».
  - Telegram without `SecondaryButton`: in-app «Скины» and «Правила».
- Auto-show: once the state is loaded (`ready && !rulesSeen`), open the dialog.
  Closing it marks `rulesSeen` and saves. The «Правила» button opens the same
  dialog at any time.
- The dialog is Russian-only, like the rest of the interface; localization is
  a separate feature.

## 3. Rules text

- Настроение падает само: −20 в час.
- «Покормить» — раз в 24 часа: +20, но не выше 20.
- Задача сразу поднимает настроение (20 + 10 за каждый час), но пока она
  идёт, настроение падает быстрее.
- «Выполнено» — настроение остаётся; «Отказаться» или просрочка — падает до 0.
- На нуле персонаж отворачивается, при −100 уходит и вернётся через 2 часа.
- Полоску настроения можно перетаскивать, чтобы посмотреть состояния.
- Скины меняют палитру персонажа.

## Files

- New: `src/components/RulesDialog.vue`
- Modify: `src/tamagotchi.ts`, `src/storage.ts`, `src/App.vue`, `README.MD`
- No new dependencies, no binary assets.

## Verification

- `npm run typecheck` and `npm run build` pass.
- An old save without `rulesSeen` shows the dialog once on load; after closing,
  a reload does not show it again, and the «Правила» button still opens it.
- The three buttons fit a 390px-wide viewport; screenshots of the dialog and
  the row.
