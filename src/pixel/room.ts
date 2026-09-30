import { createCanvas, fillEllipse, fillRect, toPixelMap, type PixelMap } from './canvas'

export const ROOM_WIDTH = 400
export const ROOM_HEIGHT = 700
export const ART_SCALE = 2

export const WALL = { x: 0, y: 0, width: 400, height: 700 }
export const FLOOR = { x: 0, y: 470, width: 400, height: 230 }
export const BASEBOARD = { x: 0, y: 466, width: 400, height: 8 }
export const DOOR_FRAME = { x: 108, y: 180, width: 184, height: 300 }
export const DOOR_OPENING = { x: 120, y: 192, width: 160, height: 288 }
export const WINDOW_FRAME = { x: 20, y: 150, width: 72, height: 120 }
export const WINDOW_PANE = { x: 24, y: 154, width: 64, height: 112 }
export const WINDOW_BAR_V = { x: 52, y: 154, width: 8, height: 112 }
export const WINDOW_BAR_H = { x: 24, y: 206, width: 64, height: 8 }
export const RUG = { x: 60, y: 524, width: 280, height: 72 }
export const SUN_POS = { x: 20, y: 142 }
export const MOON_POS = { x: 24, y: 146 }
export const TREE_POS = { x: 244, y: 320 }
export const DOOR_LEAF_WIDTHS = [0, 52, 106, 160]
export const DOOR_STEP_MS = 150
export const DOOR_GRASS = { y: 372, height: 108 }
export const DOOR_EDGE = 4
export const KNOB = { x: 260, y: 340, width: 8, height: 8 }

export const RUG_MAP: PixelMap = (() => {
  const canvas = createCanvas(RUG.width / ART_SCALE, RUG.height / ART_SCALE)
  fillEllipse(canvas, 70, 18, 70, 18, 'U')
  return toPixelMap(canvas)
})()

export const SUN_MAP: PixelMap = (() => {
  const canvas = createCanvas(24, 24)
  fillEllipse(canvas, 12, 12, 12, 12, 'S')
  return toPixelMap(canvas)
})()

export const MOON_MAP: PixelMap = (() => {
  const canvas = createCanvas(20, 20)
  fillEllipse(canvas, 10, 10, 10, 10, 'M')
  fillEllipse(canvas, 7, 7, 2, 2, 'C')
  fillEllipse(canvas, 12, 12, 1, 1, 'C')
  return toPixelMap(canvas)
})()

export const TREE_MAP: PixelMap = (() => {
  const canvas = createCanvas(24, 26)
  fillRect(canvas, 11, 14, 3, 12, 'R')
  fillEllipse(canvas, 12, 9, 9, 8, 'T')
  return toPixelMap(canvas)
})()
