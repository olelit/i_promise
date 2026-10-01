# Tamagotchi: Localization (Russian / English) — Design

Date: 2026-10-01
Status: Draft (pending user review)

Stage 14.

## Goal

Make the whole interface bilingual — Russian and English — with the language
detected at launch. Russian-speaking users keep the current experience; every
other language gets English.

## 1. Locale detection

- `Locale = 'ru' | 'en'`.
- Source: Telegram `initDataUnsafe.user.language_code`; in browser mode
  `navigator.language`. Normalize: lowercase, the part before `-`; `ru` starts
  with `ru` → `ru`, everything else → `en`.
- The locale is fixed at startup (Telegram restarts the Mini App when the user
  changes the app language), so no runtime switching is needed.

## 2. String catalog

- New `src/i18n.ts` holds `locale`, a typed `messages` catalog
  (`{ ru, en }` entries, including parameterized functions for strings with
  values) and the accessor `m(entry)` that returns the entry for the current
  locale.
- `formatRemaining(ms)` moves from `src/tamagotchi.ts` to `src/i18n.ts`
  (it is presentation formatting) and returns localized time text; the two
  components that use it import it from the catalog module.
- `src/pixel/skins.ts`: the `name` field moves out; skin names live in the
  i18n catalog (`SKIN_NAMES` keyed by `SkinId`, accessor `skinName(id)`).
- `src/phrases.ts`: the phrase catalog becomes
  `Record<PhraseEvent, Record<Locale, string[]>>`; `pickPhrase(event)` picks
  from the current locale.

## 3. Components

- All hardcoded Russian strings are replaced with catalog lookups:
  - `App.vue`: browser banner, task/skins/rules buttons, MainButton and
    SecondaryButton texts.
  - `MoodControls.vue`: feed label, «Сыт», cooldown and away messages.
  - `MoodIndicator.vue`: the meter aria-label.
  - `TaskCreateDialog.vue` and `TaskInfoDialog.vue`: titles, labels,
    placeholders and buttons.
  - `SkinDialog.vue`: title and skin names.
- No i18n library; no new dependencies.

## 4. Rules

- The rules dialog (stage 13) is built on the same catalog, so it ships
  bilingual from the start.

## Files

- New: `src/i18n.ts`
- Modify: `src/tamagotchi.ts`, `src/phrases.ts`, `src/pixel/skins.ts`,
  `src/App.vue`, `src/components/MoodControls.vue`,
  `src/components/MoodIndicator.vue`, `src/components/TaskCreateDialog.vue`,
  `src/components/TaskInfoDialog.vue`, `src/components/SkinDialog.vue`,
  `README.MD`
- No new dependencies, no binary assets.

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless screenshots with `--lang=ru` and `--lang=en` show the interface in
  the right language; unknown languages fall back to English.
- Manual in Telegram: a Russian-language account sees Russian, others see
  English.
