# Tamagotchi: Mood, Indicator, Feeding, Body — Design

Date: 2026-09-23
Status: Approved (user waived review gates)

Stage 1 of 3 (stage 2: tasks, stage 3: speech bubbles).

## Goal

Replace petting with a once-a-day feeding, add a vertical mood indicator to the
right of the character, and give the character a full body. Keep the existing
decay/away/return mechanics.

## Mechanics

| Constant             | Value            |
| -------------------- | ---------------- |
| `FEED_GAIN`          | `20`             |
| `FEED_CAP`           | `20`             |
| `FEED_COOLDOWN_MS`   | `24 * 3600_000`  |
| decay / away / return | unchanged: `-20`/hour, away at `-100`, return after `2h` at `-50` |

- `canFeed(state, now)`: `false` while `awayUntil !== null` (the pet is not
  there); otherwise `true` when `lastFedAt === null` or
  `now - lastFedAt >= FEED_COOLDOWN_MS`.
- `feed(state, now)`: `mood = min(FEED_CAP, mood + FEED_GAIN)`, `lastFedAt = now`.
  Feeding never raises mood above `FEED_CAP`; if mood is already at or above the
  cap the call still consumes the daily feeding.
- `pet` and `PET_GAIN` are removed. The old dev slider is removed.
- The MainButton is not used in this stage (stage 2 gives it to tasks).

## State and storage

```ts
interface TamagotchiState {
  mood: number
  lastSeen: number
  awayUntil: number | null
  lastFedAt: number | null
}
```

- `createInitialState` sets `lastFedAt: null`.
- Storage validation accepts old saved states that lack `lastFedAt` and
  normalizes the field to `null`, so existing CloudStorage/localStorage data
  keeps working.

## Mood indicator (`src/components/MoodIndicator.vue`)

- Props: `mood: number`.
- Vertical rounded track, ~14px wide and 160px tall, placed to the right of the
  character and vertically centered (the character row is a flex row with
  `align-items: center`).
- Fill from the bottom: `fraction = clamp((mood + 100) / 200, 0, 1)`.
- Color: `hue = 120 * clamp(mood / 100, 0, 1)` rendered as
  `hsl(hue, 70%, 45%)` — `100` green, `50` yellow, `0` and below red.
- No numbers or labels. Accessibility: `role="meter"`, `aria-valuemin="-100"`,
  `aria-valuemax="100"`, `:aria-valuenow="Math.round(mood)"`,
  `aria-label="Настроение"`.
- Height and color transition smoothly (0.6s).

## Body (`src/components/Tamagotchi.vue`)

- Full body instead of just a head: existing head (body ellipse, ears, face)
  plus a torso, two arms and two feet, same fixed palette
  (`#7ec8a9` body, `#a8dcc0` belly, `#2f4f43` features, `#f4a3a3` blush,
  `#5da88b` back curl).
- Front view keeps the face interpolation (`+100..+1`), back view has no face.
- Unchanged: 2D flip at `mood <= 0` (scaleX squash, no 3D transforms), crouch at
  `mood < 0`, exit/return slide when away. Scene stays 200x200.

## Screen (`src/App.vue`, `src/components/MoodControls.vue`)

- Layout: a row containing `Tamagotchi` and `MoodIndicator`, with the feed
  controls below.
- `MoodControls` props: `{ remainingMs: number | null, nextFeedMs: number | null }`;
  emits `feed`. `remainingMs` is the away countdown (non-null while away);
  `nextFeedMs` is the time until feeding is allowed again (`null` when feeding
  is possible now).
- Feed button «ПОКОРМИТЬ»: enabled when `nextFeedMs === null`; otherwise
  disabled with the label `Покормить через <formatRemaining(nextFeedMs)>`.
  Hidden entirely while away (`remainingMs !== null`), where the existing away
  message is shown instead.
- Hint text: «Настроение падает само. Покорми раз в день, чтобы поднять.»
- Successful feed triggers a light haptic in Telegram.
- The same in-page button is used in browser mode; there are no separate dev
  controls any more.

## Files

- Modify: `src/tamagotchi.ts`, `src/storage.ts`, `src/components/Tamagotchi.vue`,
  `src/components/MoodControls.vue`, `src/App.vue`, `README.MD`
- Create: `src/components/MoodIndicator.vue`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless browser (state injected before app scripts via CDP
  `Page.addScriptToEvaluateOnNewDocument`): indicator fill and color at moods
  `100`, `50`, `0`, `-50`; feed button enabled/disabled states; feeding raises
  mood by 20 up to the cap and sets the cooldown; away hides the feed button.
- Manual in Telegram: feed works once, reload keeps `lastFedAt`, second feed is
  blocked with a countdown.
