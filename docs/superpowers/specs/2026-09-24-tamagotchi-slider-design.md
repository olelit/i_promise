# Tamagotchi: Interactive Mood Bar and Smooth Transitions — Design

Date: 2026-09-24
Status: Approved (user waived review gates)

Stage 7.

## Goal

Make the top mood bar draggable (in Telegram and in the browser) so states can
be previewed without waiting, remove the browser-only «Тест анимаций» button,
and make the character's face morph smoothly when the mood changes.

## 1. Interactive mood bar

- `MoodIndicator.vue` gains an `interactive?: boolean` prop and a `setMood`
  emit.
- The visual meter stays as is; when `interactive`, a transparent
  `<input type="range" min="-100" max="100" step="1">` is overlaid on the whole
  bar (`position: absolute; inset: 0; opacity: 0; cursor: pointer`), so tap and
  drag work with both mouse and touch. `@input` emits `setMood(Number(value))`.
- Accessibility: in interactive mode the decorative meter gets `aria-hidden`
  and the range input carries `aria-label="Настроение"` (range inputs expose
  min/max/now natively).
- `App.vue` handles it:

```ts
function handleSetMood(mood: number): void {
  now.value = Date.now()
  state.value = {
    ...state.value,
    mood,
    lastSeen: now.value,
    awayUntil: mood <= MOOD_MIN ? now.value + AWAY_DURATION_MS : null,
  }
  void saveState(state.value)
}
```

Dragging to `-100` therefore enters the away state immediately (message and
door closing included), dragging back up calls the character back.
- The bar is interactive in both modes: in Telegram it replaces the removed
  test button, in the browser it does the same.

## 2. Remove the test button

- `App.vue`: delete `TEST_MOODS`, `testStep`, `handleTestAnimation`, the
  «Тест анимаций» button and its style. `MOOD_MIN`/`AWAY_DURATION_MS` imports
  stay (used by `handleSetMood`).

## 3. Smooth face transitions

- `Tamagotchi.vue`: the face elements get CSS transitions so attribute-driven
  changes animate instead of jumping:

```css
.face path,
.face ellipse,
.face circle,
.face line {
  transition:
    d 0.4s ease,
    rx 0.4s ease,
    ry 0.4s ease,
    cy 0.4s ease,
    transform 0.4s ease,
    opacity 0.4s ease;
}
```

  (`d` for the mouth curve, `ry`/`cy` for the eyes and pupils, `transform` for
  the brows, `opacity` for the blush — all supported as CSS properties in
  modern Chromium/WebKit.)
- `MoodIndicator.vue`: the fill's width transition drops to `0.2s ease` so
  dragging feels responsive while discrete changes still smooth out; the
  colour transition stays `0.6s`.
- Existing transitions (turn 0.28s, crouch 0.6s, exit 1s, door 0.9s) stay
  unchanged.

## Files

- Modify: `src/components/MoodIndicator.vue`, `src/App.vue`,
  `src/components/Tamagotchi.vue`, `README.MD`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless: dragging the range input changes the mood (set the input's value
  and dispatch `input`; the meter fill and the state update); dragging to
  `-100` shows the away message and closes the door; the test button is gone;
  the mouth path changes gradually mid-transition (sample the `d` attribute
  ~150ms after a mood jump and confirm it differs from both endpoints); the
  fill's `transition-property` includes width.
- Manual in Telegram: the bar can be dragged, states change smoothly.
