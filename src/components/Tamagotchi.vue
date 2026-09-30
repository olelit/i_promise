<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import PixelSprite from './PixelSprite.vue'
import {
  BREATH_MS,
  characterMap,
  moodState,
  walkMap,
  WALK_FRAME_MS,
  WALK_MS,
} from '../pixel/character'
import { DOOR_OPEN_MS } from '../pixel/room'

const props = defineProps<{ mood: number; away: boolean; animate?: boolean }>()

const state = computed(() => moodState(props.mood))
const walking = ref(false)
const hidden = ref(false)
const walkFrame = ref<0 | 1>(0)
const breath = ref<0 | 1>(0)

let walkTimer: number | undefined
let delayTimer: number | undefined
let frameTimer: number | undefined
let breathTimer: number | undefined

function stopWalk(): void {
  if (frameTimer !== undefined) {
    window.clearInterval(frameTimer)
    frameTimer = undefined
  }
  if (walkTimer !== undefined) {
    window.clearTimeout(walkTimer)
    walkTimer = undefined
  }
}

function clearTimers(): void {
  stopWalk()
  if (delayTimer !== undefined) {
    window.clearTimeout(delayTimer)
    delayTimer = undefined
  }
}

function startWalk(leaving: boolean): void {
  walkFrame.value = leaving ? 0 : 1
  walking.value = true
  frameTimer = window.setInterval(() => {
    walkFrame.value = walkFrame.value === 0 ? 1 : 0
  }, WALK_FRAME_MS)
  walkTimer = window.setTimeout(() => {
    walking.value = false
    stopWalk()
    hidden.value = leaving
  }, WALK_MS)
}

watch(
  () => props.away,
  (away) => {
    clearTimers()
    if (props.animate === false) {
      walking.value = false
      hidden.value = away
      return
    }
    if (away) {
      hidden.value = false
      startWalk(true)
    } else if (!hidden.value) {
      startWalk(false)
    } else {
      delayTimer = window.setTimeout(() => {
        delayTimer = undefined
        hidden.value = false
        startWalk(false)
      }, DOOR_OPEN_MS)
    }
  },
)

breathTimer = window.setInterval(() => {
  breath.value = breath.value === 0 ? 1 : 0
}, BREATH_MS)

onUnmounted(() => {
  clearTimers()
  if (breathTimer !== undefined) {
    window.clearInterval(breathTimer)
  }
})

const key = computed(() => (walking.value ? 'walk' : state.value))
const map = computed(() =>
  walking.value ? walkMap(walkFrame.value) : characterMap(state.value, breath.value),
)
</script>

<template>
  <div class="scene">
    <div class="walk" :class="{ away, instant: animate === false, hidden }">
      <Transition name="sprite">
        <svg :key="key" class="layer" viewBox="0 0 48 48" aria-hidden="true">
          <PixelSprite :map="map" />
        </svg>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  width: 240px;
  height: 240px;
}

.walk {
  width: 100%;
  height: 100%;
  transform: translateY(0);
  transition: transform 0.6s steps(3, end);
}

.walk.away {
  transform: translateY(calc(-80 / 700 * 100vh));
}

@media (min-aspect-ratio: 4/7) {
  .walk.away {
    transform: translateY(-22.5vw);
  }
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.sprite-enter-active,
.sprite-leave-active {
  transition: opacity 0.15s ease;
}

.sprite-enter-from,
.sprite-leave-to {
  opacity: 0;
}

.walk.instant {
  transition: none;
}

.walk.hidden {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .walk {
    transition: none;
  }

  .sprite-enter-active,
  .sprite-leave-active {
    transition: none;
  }
}
</style>
