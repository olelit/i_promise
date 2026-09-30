<script setup lang="ts">
import { computed } from 'vue'
import PixelSprite from './PixelSprite.vue'
import { PALETTE } from '../pixel/palette'
import {
  BASEBOARD,
  DOOR_FRAME,
  DOOR_OPENING,
  FLOOR,
  MOON_MAP,
  MOON_POS,
  RUG,
  RUG_MAP,
  SUN_MAP,
  SUN_POS,
  TREE_MAP,
  TREE_POS,
  WALL,
  WINDOW_BAR_H,
  WINDOW_BAR_V,
  WINDOW_FRAME,
  WINDOW_PANE,
} from '../pixel/room'

const props = defineProps<{ away: boolean; front?: boolean; now: number }>()

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
</script>

<template>
  <div class="room" :class="{ front }" aria-hidden="true">
    <svg
      class="scene"
      viewBox="0 0 400 700"
      preserveAspectRatio="xMidYMid slice"
      shape-rendering="crispEdges"
    >
      <template v-if="!front">
        <defs>
          <clipPath id="room-window-pane">
            <rect
              :x="WINDOW_PANE.x"
              :y="WINDOW_PANE.y"
              :width="WINDOW_PANE.width"
              :height="WINDOW_PANE.height"
            />
          </clipPath>
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
            y="372"
            :width="DOOR_OPENING.width"
            height="108"
            :fill="PALETTE.G"
          />
          <PixelSprite :map="TREE_MAP" :x="TREE_POS.x" :y="TREE_POS.y" :scale="2" />
        </g>
        <rect
          :x="WINDOW_FRAME.x"
          :y="WINDOW_FRAME.y"
          :width="WINDOW_FRAME.width"
          :height="WINDOW_FRAME.height"
          :fill="PALETTE.B"
        />
        <g clip-path="url(#room-window-pane)">
          <rect
            :x="WINDOW_PANE.x"
            :y="WINDOW_PANE.y"
            :width="WINDOW_PANE.width"
            :height="WINDOW_PANE.height"
            :fill="PALETTE.K"
          />
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
        </g>
        <rect
          :x="WINDOW_BAR_V.x"
          :y="WINDOW_BAR_V.y"
          :width="WINDOW_BAR_V.width"
          :height="WINDOW_BAR_V.height"
          :fill="PALETTE.B"
        />
        <rect
          :x="WINDOW_BAR_H.x"
          :y="WINDOW_BAR_H.y"
          :width="WINDOW_BAR_H.width"
          :height="WINDOW_BAR_H.height"
          :fill="PALETTE.B"
        />
        <PixelSprite :map="RUG_MAP" :x="RUG.x" :y="RUG.y" :scale="2" />
        <rect x="0" y="0" width="400" height="700" :fill="PALETTE.N" :opacity="nightOpacity" />
      </template>
      <g v-else class="door front-door" :class="{ closed: away }">
        <rect x="120" y="192" width="160" height="288" rx="4" fill="#b07b52" />
        <circle cx="264" cy="350" r="6" fill="#f4d35e" />
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

.door {
  transform-box: fill-box;
  transform-origin: left center;
}

.front-door {
  transform: scaleX(0.18);
  opacity: 0;
  transition: transform 0.5s ease;
}

.front-door.closed {
  transform: scaleX(1);
  opacity: 1;
  transition:
    transform 0.5s ease 0.7s,
    opacity 0.15s linear 0.7s;
}

@media (prefers-reduced-motion: reduce) {
  .front-door,
  .front-door.closed {
    transition: none;
  }
}
</style>
