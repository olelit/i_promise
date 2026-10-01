<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import PixelSprite from './PixelSprite.vue'
import { PALETTE } from '../pixel/palette'
import {
  BASEBOARD,
  DOOR_EDGE,
  DOOR_FRAME,
  DOOR_GRASS,
  DOOR_LEAF_WIDTHS,
  DOOR_OPENING,
  DOOR_STEP_MS,
  FLOOR,
  KNOB,
  MOON_MAP,
  MOON_POS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  RUG,
  RUG_MAP,
  SUN_MAP,
  SUN_POS,
  TREE_MAP,
  TREE_POS,
  WALL,
  WINDOW,
  WINDOW_MAP,
} from '../pixel/room'
import { WALK_MS } from '../pixel/character'

const props = defineProps<{ away: boolean; front?: boolean; now: number; animate?: boolean }>()

function daylightAt(timestamp: number): number {
  const date = new Date(timestamp)
  const hour = date.getHours() + date.getMinutes() / 60
  if (hour >= 8 && hour <= 20) {
    return 1
  }
  if (hour >= 6 && hour < 8) {
    return (hour - 6) / 2
  }
  if (hour > 20 && hour <= 22) {
    return (22 - hour) / 2
  }
  return 0
}

const daylight = computed(() => daylightAt(props.now))
const nightOpacity = computed(() => 0.45 * (1 - daylight.value))

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const doorFrame = ref(props.away ? DOOR_LEAF_WIDTHS.length - 1 : 0)
const leafWidth = computed(() => DOOR_LEAF_WIDTHS[doorFrame.value])

let doorTimer: number | undefined
let doorDelay: number | undefined

function clearDoorTimers(): void {
  if (doorTimer !== undefined) {
    window.clearInterval(doorTimer)
    doorTimer = undefined
  }
  if (doorDelay !== undefined) {
    window.clearTimeout(doorDelay)
    doorDelay = undefined
  }
}

watch(
  () => props.away,
  (away) => {
    clearDoorTimers()
    if (props.animate === false) {
      doorFrame.value = away ? DOOR_LEAF_WIDTHS.length - 1 : 0
      return
    }
    if (reducedMotion) {
      doorFrame.value = away ? DOOR_LEAF_WIDTHS.length - 1 : 0
      return
    }
    if (away) {
      doorDelay = window.setTimeout(() => {
        doorTimer = window.setInterval(() => {
          if (doorFrame.value < DOOR_LEAF_WIDTHS.length - 1) {
            doorFrame.value += 1
          } else {
            clearDoorTimers()
          }
        }, DOOR_STEP_MS)
      }, WALK_MS)
    } else if (doorFrame.value > 0) {
      doorTimer = window.setInterval(() => {
        if (doorFrame.value > 0) {
          doorFrame.value -= 1
        } else {
          clearDoorTimers()
        }
      }, DOOR_STEP_MS)
    }
  },
)

onUnmounted(clearDoorTimers)
</script>

<template>
  <div class="room" :class="{ front }" aria-hidden="true">
    <svg
      class="scene"
      :viewBox="`0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}`"
      preserveAspectRatio="xMidYMid slice"
      shape-rendering="crispEdges"
    >
      <template v-if="!front">
        <defs>
          <clipPath id="room-door-opening">
            <rect
              :x="DOOR_OPENING.x"
              :y="DOOR_OPENING.y"
              :width="DOOR_OPENING.width"
              :height="DOOR_OPENING.height"
            />
          </clipPath>
        </defs>
        <rect :x="WALL.x" :y="WALL.y" :width="WALL.width" :height="WALL.height" :fill="PALETTE.W" />
        <rect :x="FLOOR.x" :y="FLOOR.y" :width="FLOOR.width" :height="FLOOR.height" :fill="PALETTE.F" />
        <rect
          :x="BASEBOARD.x"
          :y="BASEBOARD.y"
          :width="BASEBOARD.width"
          :height="BASEBOARD.height"
          :fill="PALETTE.B"
        />
        <rect
          :x="DOOR_FRAME.x"
          :y="DOOR_FRAME.y"
          :width="DOOR_FRAME.width"
          :height="DOOR_FRAME.height"
          :fill="PALETTE.D"
        />
        <g clip-path="url(#room-door-opening)">
          <rect
            :x="DOOR_OPENING.x"
            :y="DOOR_OPENING.y"
            :width="DOOR_OPENING.width"
            :height="DOOR_OPENING.height"
            :fill="PALETTE.O"
          />
          <rect
            :x="DOOR_OPENING.x"
            :y="DOOR_GRASS.y"
            :width="DOOR_OPENING.width"
            :height="DOOR_GRASS.height"
            :fill="PALETTE.G"
          />
          <PixelSprite :map="TREE_MAP" :x="TREE_POS.x" :y="TREE_POS.y" :scale="2" />
        </g>
        <PixelSprite :map="WINDOW_MAP" :x="WINDOW.x" :y="WINDOW.y" :scale="2" />
        <PixelSprite
          :map="SUN_MAP"
          :x="SUN_POS.x"
          :y="SUN_POS.y"
          :scale="2"
          :opacity="daylight"
        />
        <PixelSprite
          :map="MOON_MAP"
          :x="MOON_POS.x"
          :y="MOON_POS.y"
          :scale="2"
          :opacity="1 - daylight"
        />
        <PixelSprite :map="RUG_MAP" :x="RUG.x" :y="RUG.y" :scale="2" />
        <rect x="0" y="0" width="400" height="700" :fill="PALETTE.N" :opacity="nightOpacity" />
      </template>
      <g v-else>
        <rect
          v-if="leafWidth > 0"
          :x="DOOR_OPENING.x"
          :y="DOOR_OPENING.y"
          :width="leafWidth"
          :height="DOOR_OPENING.height"
          :fill="PALETTE.L"
        />
        <rect
          v-if="leafWidth > 0 && leafWidth < DOOR_OPENING.width"
          :x="DOOR_OPENING.x + leafWidth - DOOR_EDGE"
          :y="DOOR_OPENING.y"
          :width="DOOR_EDGE"
          :height="DOOR_OPENING.height"
          :fill="PALETTE.D"
        />
        <rect
          v-if="leafWidth === DOOR_OPENING.width"
          :x="KNOB.x"
          :y="KNOB.y"
          :width="KNOB.width"
          :height="KNOB.height"
          :fill="PALETTE.S"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.room {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.room.front {
  z-index: 2;
}

.scene {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
