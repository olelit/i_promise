# Tamagotchi: Bare Controls, Rug Zone, Day/Night Room — Design

Date: 2026-09-24
Status: Approved (user waived review gates)

Stage 9.

## Goal

Leave only the feed button (no panel), put the character inside the rug area,
show the sun/moon through the window depending on the time of day, show the
outside world through the open door, and dim the room at night.

## 1. Bare controls

- `App.vue`: the `.controls` panel loses its background, padding, radius and
  max-width; only the layout (flex column, centered, gap) stays, so just the
  feed button (or the away message) floats over the room.
- The away message stays readable without the panel: it gets a subtle
  `text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4)`.

## 2. Character in the rug zone

- The rug moves up to `cy=495` (`rx=150`, `ry=38`, spans 457..533), so the
  character's feet (at the floor line, viewBox `y≈472`) land inside the rug and
  the rug reads as standing under the pet.

## 3. Day/night room

- `RoomScene.vue` gains a required `now: number` prop (App already ticks it
  every minute) and computes:

```ts
const hour = new Date(now).getHours() + new Date(now).getMinutes() / 60
function daylightAt(hour: number): number {
  if (hour >= 8 && hour <= 20) return 1
  if (hour >= 6 && hour < 8) return (hour - 6) / 2
  if (hour > 20 && hour <= 22) return (22 - hour) / 2
  return 0
}
```

- Window: the pane is clipped (`clipPath` to the inner pane) and contains the
  sky plus the sun (`#f4d35e`, opacity `daylight`) and the moon
  (`#e8eef7` with a `#cbd6e6` crater, opacity `1 - daylight`), both partially
  visible in the pane's upper-left corner. The cross bars and frame draw over
  them.
- Open door: the opening shows the outside world, clipped to the opening —
  a sky `#9ec9e2`, a grass strip `#8fbf7f` from `y=372`, and a simple tree
  (crown `#6da85f` + trunk `#7a5a3a`) at the horizon. The character stands in
  front of it, so the sky is visible above its head.
- Night dimming: a full-viewBox rect `#0b1a33` with
  `opacity = 0.45 * (1 - daylight)` drawn on top of the back layer (the
  character and the front door leaf stay as they are).

## Files

- Modify: `src/App.vue`, `src/components/RoomScene.vue`, `README.MD`

## Verification

- `npm run typecheck` and `npm run build` pass.
- Headless: no panel styles on `.controls` (no background/padding); the
  character's feet rect falls inside the rug ellipse's bounding box; the sun's
  `opacity` equals `daylightAt(current hour)` and the moon's its complement; the
  night overlay opacity matches `0.45 * (1 - daylight)`; the outside view group
  exists inside the opening clip; screenshots at the current time.
- Manual in Telegram: the button floats alone, the pet stands on the rug, the
  window shows the sun (day) or moon (night), the outside is visible through
  the door, and the room darkens in the evening.
