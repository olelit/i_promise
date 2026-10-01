<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import PixelSprite from './PixelSprite.vue'
import {
  BREATH_MS,
  characterMap,
  moodState,
  profileWalkMap,
  walkMap,
  WALK_FRAME_MS,
  TURN_MS,
  WALK_H_MS,
  WALK_V_MS,
  type MoodState,
} from '../pixel/character'
import { DOOR_OPEN_MS } from '../pixel/room'

const props = defineProps<{ mood: number; away: boolean; animate?: boolean }>()

type Phase =
  | 'idle'
  | 'out-turn'
  | 'out-h'
  | 'out-turn2'
  | 'out-v'
  | 'in-v'
  | 'in-turn'
  | 'in-h'
  | 'in-turn2'
  | 'reset'

const state = computed<MoodState>(() => moodState(props.mood))
const phase = ref<Phase>('idle')
const hidden = ref(false)
const atDoor = ref(props.away)
const walkFrame = ref<0 | 1>(0)
const breath = ref<0 | 1>(0)

let phaseTimer: number | undefined
let frameTimer: number | undefined
let breathTimer: number | undefined

function clearFrames(): void {
  if (frameTimer !== undefined) {
    window.clearInterval(frameTimer)
    frameTimer = undefined
  }
}

function clearPhase(): void {
  if (phaseTimer !== undefined) {
    window.clearTimeout(phaseTimer)
    phaseTimer = undefined
  }
  clearFrames()
}

function startFrames(): void {
  clearFrames()
  frameTimer = window.setInterval(() => {
    walkFrame.value = walkFrame.value === 0 ? 1 : 0
  }, WALK_FRAME_MS)
}

function later(ms: number, next: () => void): void {
  phaseTimer = window.setTimeout(() => {
    phaseTimer = undefined
    next()
  }, ms)
}

function leave(): void {
  hidden.value = false
  atDoor.value = true
  phase.value = 'out-turn'
  later(TURN_MS, () => {
    phase.value = 'out-h'
    startFrames()
    later(WALK_H_MS, () => {
      clearFrames()
      phase.value = 'out-turn2'
      later(TURN_MS, () => {
        phase.value = 'out-v'
        startFrames()
        later(WALK_V_MS, () => {
          clearFrames()
          phase.value = 'idle'
          hidden.value = true
        })
      })
    })
  })
}

function returnHome(): void {
  later(DOOR_OPEN_MS, () => {
    hidden.value = false
    atDoor.value = false
    phase.value = 'in-v'
    startFrames()
    later(WALK_V_MS, () => {
      clearFrames()
      phase.value = 'in-turn'
      later(TURN_MS, () => {
        phase.value = 'in-h'
        startFrames()
        later(WALK_H_MS, () => {
          clearFrames()
          phase.value = 'in-turn2'
          later(TURN_MS, () => {
            phase.value = 'idle'
          })
        })
      })
    })
  })
}

function resetHome(): void {
  hidden.value = false
  atDoor.value = false
  phase.value = 'reset'
  startFrames()
  later(WALK_H_MS, () => {
    clearFrames()
    phase.value = 'idle'
  })
}

watch(
  () => props.away,
  (away) => {
    clearPhase()
    if (props.animate === false) {
      phase.value = 'idle'
      hidden.value = away
      atDoor.value = away
      return
    }
    if (away) {
      leave()
    } else if (hidden.value) {
      returnHome()
    } else {
      resetHome()
    }
  },
)

breathTimer = window.setInterval(() => {
  breath.value = breath.value === 0 ? 1 : 0
}, BREATH_MS)

onUnmounted(() => {
  clearPhase()
  if (breathTimer !== undefined) {
    window.clearInterval(breathTimer)
  }
})

const key = computed(() => {
  if (phase.value === 'idle' || phase.value === 'in-turn2') {
    return state.value
  }
  if (phase.value === 'out-turn2' || phase.value === 'out-v' || phase.value === 'in-v') {
    return 'back'
  }
  return 'profile'
})

const map = computed(() => {
  switch (phase.value) {
    case 'out-turn':
      return profileWalkMap(0, 1)
    case 'out-h':
      return profileWalkMap(walkFrame.value, 1)
    case 'out-turn2':
      return characterMap('backStand', 0)
    case 'out-v':
    case 'in-v':
      return walkMap(walkFrame.value)
    case 'in-turn':
      return profileWalkMap(0, -1)
    case 'in-h':
    case 'reset':
      return profileWalkMap(walkFrame.value, -1)
    default:
      return characterMap(state.value, breath.value)
  }
})

const timingStyle = computed(() => ({
  '--turn-ms': `${TURN_MS}ms`,
  '--walk-h-ms': `${WALK_H_MS}ms`,
  '--walk-v-ms': `${WALK_V_MS}ms`,
}))
</script>

<template>
  <div class="scene" :style="timingStyle">
    <div
      class="move-x"
      :class="{ away: atDoor, reset: phase === 'reset', instant: animate === false }"
    >
      <div
        class="move-y"
        :class="{
          away: atDoor,
          reset: phase === 'reset',
          instant: animate === false,
          hidden,
        }"
      >
        <Transition name="sprite">
          <svg :key="key" class="layer" viewBox="0 0 48 48" aria-hidden="true">
            <PixelSprite :map="map" />
          </svg>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  width: 240px;
  height: 240px;
}

.move-x,
.move-y {
  width: 100%;
  height: 100%;
}

.move-x {
  transform: translateX(0);
  transition: transform var(--walk-h-ms) steps(3, end)
    calc(var(--walk-v-ms) + var(--turn-ms));
}

.move-x.away {
  transform: translateX(calc(96 / 700 * 100vh));
  transition-delay: var(--turn-ms);
}

.move-y {
  transform: translateY(0);
  transition: transform var(--walk-v-ms) steps(2, end);
}

.move-y.away {
  transform: translateY(calc(-80 / 700 * 100vh));
  transition-delay: calc(var(--turn-ms) + var(--walk-h-ms) + var(--turn-ms));
}

@media (min-aspect-ratio: 4/7) {
  .move-x.away {
    transform: translateX(24vw);
  }

  .move-y.away {
    transform: translateY(-22.5vw);
  }
}

.move-x.reset,
.move-y.reset {
  transition-delay: 0s;
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

.instant {
  transition: none;
}

.hidden {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .move-x,
  .move-y {
    transition: none;
  }

  .sprite-enter-active,
  .sprite-leave-active {
    transition: none;
  }
}
</style>
