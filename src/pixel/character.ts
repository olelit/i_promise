import {
  createCanvas,
  fillEllipse,
  mirrorX,
  setPixel,
  shiftDown,
  stamp,
  toPixelMap,
  type PixelMap,
} from './canvas'

export type MoodState =
  | 'happy'
  | 'neutral'
  | 'sad'
  | 'backStand'
  | 'backHunch'
  | 'backCrouch'

export const SPRITE_SIZE = 48
export const WALK_FRAME_MS = 150
export const TURN_MS = 150
export const WALK_H_MS = 600
export const WALK_V_MS = 400
export const LEAVE_MS = TURN_MS + WALK_H_MS + TURN_MS + WALK_V_MS
export const BREATH_MS = 1200

export function moodState(mood: number): MoodState {
  if (mood > 67) {
    return 'happy'
  }
  if (mood > 33) {
    return 'neutral'
  }
  if (mood > 0) {
    return 'sad'
  }
  if (mood > -33) {
    return 'backStand'
  }
  if (mood > -66) {
    return 'backHunch'
  }
  return 'backCrouch'
}

type Pose = {
  headDy: number
  headRy: number
  bodyDy: number
  bodyRy: number
  armDy: number
}

const STAND: Pose = { headDy: 0, headRy: 10, bodyDy: 0, bodyRy: 10, armDy: 0 }
const HUNCH: Pose = { headDy: 2, headRy: 10, bodyDy: 1, bodyRy: 8, armDy: 1 }
const CROUCH: Pose = { headDy: 4, headRy: 10, bodyDy: 2, bodyRy: 6, armDy: 2 }

const EYES_HAPPY = ['wwww', 'wwww', 'wddw', 'wddw', 'wwww']
const EYES_NEUTRAL = ['wwww', 'wddw', 'wddw', 'wwww']
const EYES_SAD = ['dddd', 'wwww', 'wddw', 'wwww', 'wwww']
const BROW_FLAT = ['ddddd']
const BROW_SAD_LEFT = ['...dd', '..dd.', '.dd..']
const BROW_SAD_RIGHT = ['dd...', '.dd..', '..dd.']
const MOUTH_SMILE = ['d........d', '.d......d.', '..dddddd..']
const MOUTH_NEUTRAL = ['..dddddd..']
const MOUTH_SAD = ['..dddddd..', '.d......d.', 'd........d']
const BACK_SWIRL = ['..dd..', '.d..d.', 'd....d']

function drawBody(
  pose: Pose,
  leftFootY: number,
  rightFootY: number,
  back: boolean,
): string[][] {
  const canvas = createCanvas(SPRITE_SIZE, SPRITE_SIZE)
  const headCy = 17 + pose.headDy
  const bodyCy = 36 + pose.bodyDy

  fillEllipse(canvas, 11, bodyCy + pose.armDy, 3, 5, 'g')
  fillEllipse(canvas, 37, bodyCy + pose.armDy, 3, 5, 'g')
  fillEllipse(canvas, 24, bodyCy, 9, pose.bodyRy, 'g')
  fillEllipse(canvas, 18, leftFootY, 4, 3, 'g')
  fillEllipse(canvas, 30, rightFootY, 4, 3, 'g')
  fillEllipse(canvas, 13, 9 + pose.headDy, 5, 5, 'g')
  fillEllipse(canvas, 35, 9 + pose.headDy, 5, 5, 'g')
  fillEllipse(canvas, 24, headCy, 11, pose.headRy, 'g')
  fillEllipse(canvas, 13, 9 + pose.headDy, 2, 2, 'l')
  fillEllipse(canvas, 35, 9 + pose.headDy, 2, 2, 'l')

  if (back) {
    fillEllipse(canvas, 24, bodyCy + pose.bodyRy - 4, 3, 2, 'l')
    stamp(canvas, BACK_SWIRL, 21, 9 + pose.headDy)
  } else {
    fillEllipse(canvas, 24, bodyCy + 3, 6, 6, 'l')
  }

  return canvas
}

function drawFront(state: 'happy' | 'neutral' | 'sad'): string[][] {
  const canvas = drawBody(STAND, 44, 44, false)

  if (state === 'happy') {
    stamp(canvas, EYES_HAPPY, 17, 14)
    stamp(canvas, EYES_HAPPY, 27, 14)
    stamp(canvas, BROW_FLAT, 16, 11)
    stamp(canvas, BROW_FLAT, 27, 11)
    stamp(canvas, MOUTH_SMILE, 19, 21)
    fillEllipse(canvas, 15, 22, 2, 1, 'b')
    fillEllipse(canvas, 33, 22, 2, 1, 'b')
  } else if (state === 'neutral') {
    stamp(canvas, EYES_NEUTRAL, 17, 15)
    stamp(canvas, EYES_NEUTRAL, 27, 15)
    stamp(canvas, BROW_FLAT, 16, 11)
    stamp(canvas, BROW_FLAT, 27, 11)
    stamp(canvas, MOUTH_NEUTRAL, 19, 23)
    fillEllipse(canvas, 15, 22, 2, 1, 'b')
    fillEllipse(canvas, 33, 22, 2, 1, 'b')
  } else {
    stamp(canvas, EYES_SAD, 17, 14)
    stamp(canvas, EYES_SAD, 27, 14)
    stamp(canvas, BROW_SAD_LEFT, 16, 11)
    stamp(canvas, BROW_SAD_RIGHT, 27, 11)
    stamp(canvas, MOUTH_SAD, 19, 21)
  }

  return canvas
}

function drawBack(pose: Pose): string[][] {
  return drawBody(pose, 44, 44, true)
}

export function characterMap(state: MoodState, frame: 0 | 1): PixelMap {
  let canvas: string[][]
  if (state === 'happy') {
    canvas = drawFront('happy')
  } else if (state === 'neutral') {
    canvas = drawFront('neutral')
  } else if (state === 'sad') {
    canvas = drawFront('sad')
  } else if (state === 'backStand') {
    canvas = drawBack(STAND)
  } else if (state === 'backHunch') {
    canvas = drawBack(HUNCH)
  } else {
    canvas = drawBack(CROUCH)
  }
  return toPixelMap(frame === 1 ? shiftDown(canvas) : canvas)
}

export function walkMap(frame: 0 | 1): PixelMap {
  const canvas =
    frame === 0 ? drawBody(STAND, 43, 45, true) : drawBody(STAND, 45, 43, true)
  return toPixelMap(canvas)
}

const PROFILE_EYE = ['ww', 'wd', 'ww']

function drawProfile(frame: 0 | 1): string[][] {
  const canvas = createCanvas(SPRITE_SIZE, SPRITE_SIZE)
  fillEllipse(canvas, 24, 17, 11, 10, 'g')
  fillEllipse(canvas, 29, 9, 5, 5, 'g')
  fillEllipse(canvas, 29, 9, 2, 2, 'l')
  fillEllipse(canvas, 34, 20, 2, 2, 'g')
  setPixel(canvas, 36, 20, 'd')
  stamp(canvas, PROFILE_EYE, 30, 14)
  fillEllipse(canvas, 24, 36, 9, 10, 'g')
  fillEllipse(canvas, 29, 39, 4, 6, 'l')
  fillEllipse(canvas, 27, 36, 3, 5, 'g')
  fillEllipse(canvas, 14, 41, 2, 1, 'l')
  if (frame === 0) {
    fillEllipse(canvas, 20, 44, 4, 3, 'g')
    fillEllipse(canvas, 29, 43, 4, 3, 'g')
  } else {
    fillEllipse(canvas, 20, 43, 4, 3, 'g')
    fillEllipse(canvas, 29, 44, 4, 3, 'g')
  }
  return canvas
}

export function profileWalkMap(frame: 0 | 1, facing: 1 | -1): PixelMap {
  const canvas = drawProfile(frame)
  return toPixelMap(facing === 1 ? canvas : mirrorX(canvas))
}
