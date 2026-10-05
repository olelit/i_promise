import { createCanvas, fillEllipse, fillRect, toPixelMap, type PixelMap } from './canvas'

export const ROOM_WIDTH = 400
export const ROOM_HEIGHT = 700
export const ART_SCALE = 2

export const WALL = { x: 0, y: 0, width: 400, height: 700 }
export const FLOOR = { x: 0, y: 470, width: 400, height: 230 }
export const BASEBOARD = { x: 0, y: 466, width: 400, height: 8 }
export const DOOR_FRAME = { x: 204, y: 180, width: 184, height: 300 }
export const DOOR_OPENING = { x: 216, y: 192, width: 160, height: 288 }
export const WINDOW = { x: 16, y: 150, width: 96, height: 128 }
export const RUG = { x: 60, y: 524, width: 280, height: 72 }
export const SUN_POS = { x: 26, y: 160 }
export const MOON_POS = { x: 28, y: 162 }
export const TREE_POS = { x: 340, y: 320 }
export const DOOR_LEAF_WIDTHS = [0, 52, 106, 160]
export const DOOR_STEP_MS = 150
export const DOOR_OPEN_MS = (DOOR_LEAF_WIDTHS.length - 2) * DOOR_STEP_MS
export const DOOR_GRASS = { y: 372, height: 108 }
export const DOOR_EDGE = 4
export const KNOB = { x: 356, y: 340, width: 8, height: 8 }

export const RUG_MAP: PixelMap = (() => {
  const canvas = createCanvas(RUG.width / ART_SCALE, RUG.height / ART_SCALE)
  fillEllipse(canvas, 70, 18, 70, 18, 'U')
  return toPixelMap(canvas)
})()

export const WINDOW_MAP: PixelMap = (() => {
  const canvas = createCanvas(48, 64)
  fillRect(canvas, 0, 0, 48, 64, 'D')
  fillRect(canvas, 2, 2, 44, 60, 'B')
  fillRect(canvas, 4, 4, 40, 56, 'K')
  return toPixelMap(canvas)
})()

export const WINDOW_BARS_MAP: PixelMap = (() => {
  const canvas = createCanvas(48, 64)
  fillRect(canvas, 22, 4, 4, 56, 'B')
  fillRect(canvas, 4, 30, 40, 4, 'B')
  return toPixelMap(canvas)
})()

export const SUN_MAP: PixelMap = (() => {
  const canvas = createCanvas(16, 16)
  fillEllipse(canvas, 8, 8, 8, 8, 'S')
  return toPixelMap(canvas)
})()

export const MOON_MAP: PixelMap = (() => {
  const canvas = createCanvas(14, 14)
  fillEllipse(canvas, 7, 7, 7, 7, 'M')
  fillEllipse(canvas, 5, 5, 1, 1, 'C')
  fillEllipse(canvas, 8, 9, 1, 1, 'C')
  return toPixelMap(canvas)
})()

export const TREE_MAP: PixelMap = (() => {
  const canvas = createCanvas(24, 26)
  fillRect(canvas, 11, 14, 3, 12, 'R')
  fillEllipse(canvas, 12, 9, 9, 8, 'T')
  return toPixelMap(canvas)
})()
