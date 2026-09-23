# Tamagotchi Design

Date: 2026-09-23
Status: Approved

## Goal

Turn the existing Telegram Mini App demo into a tamagotchi with a single
parameter — mood — that persists per user across sessions without any
backend or database. The character's face and pose reflect mood, and it
leaves the screen when neglected.

## Non-goals

- No second parameter (hunger, energy, cleanliness, ...).
- No backend, no server-side initData validation, no database.
- No test suite (project convention: verification is typecheck + build).
- No art assets: the character is drawn with SVG in code.
- No user accounts beyond the Telegram user identity already implied by
  CloudStorage / localStorage.

## Stack

Existing stack is kept: Vue 3 + Vite + TypeScript, official
`telegram-web-app.js` script, all Telegram API access through
`src/telegram.ts`.

## State model

```ts
interface TamagotchiState {
  mood: number             // -100..100
  lastSeen: number         // ms epoch of last interaction/checkpoint
  awayUntil: number | null // ms epoch when the character returns; null = present
}
```

Constants:

| Constant           | Value      |
| ------------------ | ---------- |
| `MOOD_MAX`         | `100`      |
| `MOOD_MIN`         | `-100`     |
| `INITIAL_MOOD`     | `100`      |
| `DECAY_PER_HOUR`   | `20`       |
| `PET_GAIN`         | `20`       |
| `AWAY_DURATION_MS` | `2 * 3600_000` |
| `RETURN_MOOD`      | `-50`      |
| `TICK_MS`          | `60_000`   |

## Mechanics (pure functions in `src/tamagotchi.ts`)

- `createInitialState(now): TamagotchiState` — `{ mood: INITIAL_MOOD, lastSeen: now, awayUntil: null }`.
- `applyDecay(state, now): TamagotchiState` — pure, no side effects:
  - If `awayUntil !== null`:
    - `now >= awayUntil` → `{ mood: RETURN_MOOD, lastSeen: now, awayUntil: null }` (auto-return);
    - otherwise return the state unchanged (still away).
  - Otherwise: `hours = (now - lastSeen) / 3600_000`,
    `mood = max(MOOD_MIN, state.mood - hours * DECAY_PER_HOUR)`.
  - If the computed mood reaches `MOOD_MIN` → `{ mood: MOOD_MIN, lastSeen: now, awayUntil: now + AWAY_DURATION_MS }` (the character leaves).
  - Else → `{ mood, lastSeen: state.lastSeen, awayUntil: null }` — `lastSeen` is deliberately NOT advanced, so the display mood is always a function of time since the last real interaction.
- `pet(state, now): TamagotchiState` — `{ mood: min(MOOD_MAX, state.mood + PET_GAIN), lastSeen: now, awayUntil: state.awayUntil }`. Only called while the character is present.
- `formatRemaining(ms): string` — human countdown for the away message, e.g. `1 ч 59 мин` (minutes rounded up; `< 1 мин` when under a minute).

## Visual behavior (`src/components/Tamagotchi.vue`)

Props: `mood: number`, `away: boolean`.

- `mood +100..+1` (present, front view): the face is interpolated by
  `t = mood / MOOD_MAX` (1 → 0):
  - mouth: quadratic SVG curve whose control point moves from a smile
    (+8) to a frown (−8);
  - eyes: from happy arcs to droopy half-closed eyes;
  - brows: neutral at high mood, tilted inward as mood falls.
- `mood === 0` and below: the character is turned away — CSS 3D flip
  (`transform: rotateY(180deg)`, two SVG layers with
  `backface-visibility: hidden`); the back layer has no face.
- `mood -1..-99`: back view plus a crouch: `crouch = |mood| / 100`,
  `translateY` down to ~10% and `scaleY` down to ~0.85 at −99.
- `mood === -100` / `away === true`: exit animation — slides off the
  left edge (`translateX(-140%)`), then the scene shows only the away
  message. On return (`away` false after being true) it slides back in
  from the left.

## Screen and controls (`src/components/MoodControls.vue`)

Props: `mood`, `awayUntil`; emits `pet` and `setMood` (dev slider only).

- MainButton «Погладить»: shown while present; click → `pet` +
  `HapticFeedback.impactOccurred('light')`; disabled when
  `mood === MOOD_MAX`.
- While away: MainButton hidden, an away message shows
  `Вернётся через <formatRemaining(awayUntil - now)>`, refreshed by the
  app tick.
- Browser mode (not inside Telegram): an in-page «Погладить» button and a
  development slider (`input[type=range]`, `-100..100`) that sets mood
  directly to preview every visual state without waiting.

## Orchestration (`src/App.vue`)

- Keeps the existing shell behavior: `ready()`, `expand()`, theme CSS
  custom properties, `themeChanged` subscription, and the browser banner
  (banner text updated to say that in browser mode state is stored
  locally).
- On mount: `loadState()` → `applyDecay(now)` → set state; save if the
  decayed state differs (e.g. auto-return or newly away).
- `setInterval(TICK_MS)`: recompute `applyDecay(state, now)` for display
  and the away countdown; persist only when the away transition happens
  (entering or leaving away). No per-tick writes.
- `pet` and dev `setMood` handlers update state and `saveState`.
- On `visibilitychange` → hidden: `saveState(applyDecay(state, now))`.
- On unmount: clear interval and remove listeners.

## Persistence (`src/storage.ts`)

- `KEY = 'tamagotchi-state'`; value is `JSON.stringify(TamagotchiState)`.
- `loadState(): Promise<TamagotchiState | null>` and
  `saveState(state): Promise<void>`.
- Route: if `webApp?.CloudStorage` is available (inside Telegram, Bot API
  6.9+) use it (`getItem`/`setItem`, callback-based); on any CloudStorage
  error fall back to `localStorage`. Outside Telegram use `localStorage`
  directly.
- Validation on load: parsed JSON must have a finite numeric `mood`,
  numeric `lastSeen`, and `awayUntil` either `null` or numeric; otherwise
  return `null` (fresh start).
- All storage errors are swallowed (logged via `console.warn` at most);
  a failure to persist must never break the UI.

## Types (`src/telegram.ts`)

Add:

```ts
export interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (error: string | null, success?: boolean) => void): void
  getItem(key: string, callback: (error: string | null, value?: string) => void): void
  removeItem(key: string, callback?: (error: string | null, success?: boolean) => void): void
}
```

and `CloudStorage?: TelegramCloudStorage` on `TelegramWebApp` (optional:
absent on clients older than Bot API 6.9).

## File changes

- Modify: `src/telegram.ts` (CloudStorage types)
- Create: `src/tamagotchi.ts`
- Create: `src/storage.ts`
- Create: `src/components/Tamagotchi.vue`
- Create: `src/components/MoodControls.vue`
- Modify: `src/App.vue`
- Delete: `src/components/UserCard.vue`, `src/components/DemoControls.vue`
- Modify: `README.MD` (tamagotchi description, mechanics, CloudStorage note)
- Modify: `AGENTS.md` (project description; persistence only via `src/storage.ts`)

## Error handling and edge cases

- Corrupt or missing stored state → fresh state (`mood: 100`).
- CloudStorage unavailable/erroring → localStorage; localStorage
  throwing (private mode) → in-memory only, no crash.
- Device clock going backwards: `hours` can be negative; clamp the
  computed mood to `MOOD_MAX` as well, so mood never exceeds the scale.
- Multiple open sessions are not synchronized (CloudStorage has no
  subscriptions); last write wins. Acceptable for the demo.
- `awayUntil` in the past on load → auto-return path fires immediately.

## Verification

- `npm run typecheck` and `npm run build` pass.
- Manual in browser: dev slider walks mood through +100, +50, 0, −50,
  −99, −100 and shows happy → sad face, back turn, crouch, exit + away
  message; pet button raises mood; reload keeps mood (localStorage).
- Manual in Telegram: pet raises mood, reload keeps mood via
  CloudStorage, away message countdown appears after mood hits −100.

## Documentation

- README explains the mechanics table, the single-button interaction,
  and that state is stored in Telegram CloudStorage (per user, per bot)
  with localStorage fallback — no backend.
- AGENTS.md states: all persistence goes through `src/storage.ts`; all
  Telegram API access through `src/telegram.ts`; commits in English.
