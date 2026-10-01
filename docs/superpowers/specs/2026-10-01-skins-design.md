# Tamagotchi: Skins — Design

Date: 2026-10-01
Status: Draft (pending user review)

Stage 12.

## Goal

Add three color skins for the character — the same sprites in a different
palette — selectable from a «Скины» button next to the task button and saved
with the rest of the state.

## 1. Skin palettes

`SkinId = 'classic' | 'sky' | 'rose'`. Each skin overrides four palette
characters: `g` (body), `l` (light belly/ears), `b` (blush), `d` (dark
outline/pupils); the eye white `w` stays white.

| Skin | Name | `g` | `l` | `b` | `d` |
| --- | --- | --- | --- | --- | --- |
| `classic` | «Классика» | `#7ec8a9` | `#a8dcc0` | `#f4a3a3` | `#2f4f43` |
| `sky` | «Небо» | `#7fa9c9` | `#a9c9dc` | `#f4a3a3` | `#2f4354` |
| `rose` | «Роза» | `#d98ca6` | `#ecc0cd` | `#b5657f` | `#542f3f` |

The room, rug, mood bar and speech bubble keep the base palette; only the
character is recolored.

## 2. State and persistence

- `TamagotchiState` gains `skin: SkinId`; `createInitialState` returns
  `classic`.
- `SkinId`, `SKIN_IDS` and `isSkinId(value): value is SkinId` live in
  `src/tamagotchi.ts`, so the state type stays self-contained.
- `storage.ts`: `isValidState` accepts a missing or valid `skin`;
  `normalizeState` maps a missing or invalid value to `classic`, so old saved
  states keep working.
- Selecting a skin updates the state and saves it through the existing
  `saveState` path (CloudStorage in Telegram, localStorage in the browser).

## 3. Rendering

- New `src/pixel/skins.ts`: a `Skin` catalog (`id`, `name`, `colors`) plus
  `skinColors(id): Record<string, string>`; it imports `SkinId` from
  `tamagotchi.ts`.
- `PixelSprite.vue` gains an optional `palette?: Record<string, string>` prop;
  the color lookup becomes `props.palette?.[ch] ?? PALETTE[ch]`.
- `Tamagotchi.vue` gains a `skin: SkinId` prop and passes the skin colors to
  every `PixelSprite` (mood states, breathing frames, back walk and profile
  walk).

## 4. UI

- New `SkinDialog.vue` built on `Modal.vue`: three choices, each with a pixel
  preview (the happy front portrait rendered with that skin's palette), the
  name and a marker on the selected one; emits `select` and `close`.
- Button placement:
  - Telegram: native `SecondaryButton` (Bot API 7.10+) with the text
    «Скины», default position (left of the MainButton). If the client has no
    `SecondaryButton` or `isVersionAtLeast`, fall back to the in-app themed
    button.
  - Browser mode: a themed «Скины» button next to «Начать задачу» in a bottom
    row; the same in-app button is the Telegram fallback (it then sits alone
    in that row).
- `telegram.ts` adds `TelegramSecondaryButton`, `SecondaryButton?` and
  `isVersionAtLeast?(version: string): boolean` to the WebApp interface.
- Selecting a skin triggers a light haptic impact, like the feed button.

## Files

- New: `src/pixel/skins.ts`, `src/components/SkinDialog.vue`
- Modify: `src/telegram.ts`, `src/tamagotchi.ts`, `src/storage.ts`,
  `src/components/PixelSprite.vue`, `src/components/Tamagotchi.vue`,
  `src/App.vue`, `README.MD`
- No new dependencies, no binary assets.

## Verification

- `npm run typecheck` and `npm run build` pass.
- A saved state without `skin` loads as `classic`.
- Screenshots: the dialog with three previews, and each skin applied to the
  character; selecting a skin survives a reload in browser mode.
- Manual in Telegram: the SecondaryButton appears next to the MainButton and
  opens the dialog; on clients without it the in-app button is shown.
