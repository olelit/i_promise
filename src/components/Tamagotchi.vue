<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX } from '../tamagotchi'

const props = defineProps<{ mood: number; away: boolean }>()

const t = computed(() => Math.min(1, Math.max(0, props.mood / MOOD_MAX)))
const turned = computed(() => props.mood <= 0)
const crouch = computed(() => (props.mood < 0 ? Math.min(1, -props.mood / MOOD_MAX) : 0))

const eyeRy = computed(() => 7 - (1 - t.value) * 2.5)
const pupilDy = computed(() => (1 - t.value) * 3)
const browTilt = computed(() => (1 - t.value) * 20)
const mouthPath = computed(() => {
  const curve = 20 * t.value - 12
  return `M 82 96 Q 100 ${96 + curve} 118 96`
})
const blushOpacity = computed(() => t.value)

const exitStyle = computed(() => ({
  transform: props.away ? 'translateX(-140%) rotate(-4deg)' : 'translateX(0) rotate(0deg)',
}))

const crouchStyle = computed(() => ({
  transform: `translateY(${crouch.value * 4}px) scaleY(${1 - crouch.value * 0.15})`,
}))
</script>

<template>
  <div class="scene">
    <div class="exit" :style="exitStyle">
      <div class="idle">
        <div class="crouch" :style="crouchStyle">
          <Transition name="flip" mode="out-in">
            <svg v-if="!turned" key="front" class="face" viewBox="0 0 200 200" aria-hidden="true">
              <ellipse cx="100" cy="78" rx="42" ry="40" fill="#7ec8a9" />
              <circle cx="70" cy="48" r="17" fill="#7ec8a9" />
              <circle cx="130" cy="48" r="17" fill="#7ec8a9" />
              <circle cx="70" cy="48" r="8" fill="#a8dcc0" />
              <circle cx="130" cy="48" r="8" fill="#a8dcc0" />
              <ellipse cx="100" cy="146" rx="34" ry="38" fill="#7ec8a9" />
              <ellipse cx="100" cy="156" rx="22" ry="26" fill="#a8dcc0" />
              <line
                x1="68"
                y1="128"
                x2="52"
                y2="156"
                stroke="#7ec8a9"
                stroke-width="14"
                stroke-linecap="round"
              />
              <line
                x1="132"
                y1="128"
                x2="148"
                y2="156"
                stroke="#7ec8a9"
                stroke-width="14"
                stroke-linecap="round"
              />
              <ellipse cx="80" cy="186" rx="14" ry="9" fill="#7ec8a9" />
              <ellipse cx="120" cy="186" rx="14" ry="9" fill="#7ec8a9" />
              <ellipse cx="74" cy="84" rx="7" ry="5" fill="#f4a3a3" :opacity="blushOpacity" />
              <ellipse cx="126" cy="84" rx="7" ry="5" fill="#f4a3a3" :opacity="blushOpacity" />
              <ellipse cx="80" cy="70" rx="6.5" :ry="eyeRy" fill="#ffffff" />
              <ellipse cx="120" cy="70" rx="6.5" :ry="eyeRy" fill="#ffffff" />
              <circle cx="80" :cy="70 + pupilDy" r="3.2" fill="#2f4f43" />
              <circle cx="120" :cy="70 + pupilDy" r="3.2" fill="#2f4f43" />
              <line
                x1="72"
                y1="56"
                x2="88"
                y2="56"
                stroke="#2f4f43"
                stroke-width="3"
                stroke-linecap="round"
                :transform="`rotate(${browTilt} 80 56)`"
              />
              <line
                x1="112"
                y1="56"
                x2="128"
                y2="56"
                stroke="#2f4f43"
                stroke-width="3"
                stroke-linecap="round"
                :transform="`rotate(${-browTilt} 120 56)`"
              />
              <path
                :d="mouthPath"
                fill="none"
                stroke="#2f4f43"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
            <svg v-else key="back" class="face" viewBox="0 0 200 200" aria-hidden="true">
              <ellipse cx="100" cy="78" rx="42" ry="40" fill="#7ec8a9" />
              <circle cx="70" cy="48" r="17" fill="#7ec8a9" />
              <circle cx="130" cy="48" r="17" fill="#7ec8a9" />
              <path
                d="M 100 44 q 8 -14 20 -7 q 10 6 2 14"
                fill="none"
                stroke="#5da88b"
                stroke-width="4"
                stroke-linecap="round"
              />
              <ellipse cx="100" cy="146" rx="34" ry="38" fill="#7ec8a9" />
              <line
                x1="68"
                y1="128"
                x2="52"
                y2="156"
                stroke="#7ec8a9"
                stroke-width="14"
                stroke-linecap="round"
              />
              <line
                x1="132"
                y1="128"
                x2="148"
                y2="156"
                stroke="#7ec8a9"
                stroke-width="14"
                stroke-linecap="round"
              />
              <ellipse cx="80" cy="186" rx="14" ry="9" fill="#7ec8a9" />
              <ellipse cx="120" cy="186" rx="14" ry="9" fill="#7ec8a9" />
              <ellipse cx="100" cy="162" rx="12" ry="9" fill="#a8dcc0" />
            </svg>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene {
  width: 240px;
  height: 240px;
  overflow: hidden;
}

.exit,
.idle,
.crouch {
  width: 100%;
  height: 100%;
}

.exit {
  transition: transform 1s ease;
}

.idle {
  transform-origin: bottom center;
  animation: idle-sway 5s ease-in-out infinite;
}

@keyframes idle-sway {
  0%,
  100% {
    transform: rotate(-1.2deg) translateY(0);
  }
  50% {
    transform: rotate(1.2deg) translateY(-3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .idle {
    animation: none;
  }
}

.crouch {
  transform-origin: bottom center;
  transition: transform 0.6s ease;
}

.face {
  width: 100%;
  height: 100%;
  display: block;
}

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

.flip-enter-active,
.flip-leave-active {
  transition: transform 0.28s ease;
}

.flip-enter-from {
  transform: translateX(10px) rotate(4deg) scaleX(0.12);
}

.flip-leave-to {
  transform: translateX(-10px) rotate(-4deg) scaleX(0.12);
}
</style>
