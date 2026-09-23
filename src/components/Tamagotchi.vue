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
  return `M 78 122 Q 100 ${122 + curve} 122 122`
})
const blushOpacity = computed(() => t.value)

const exitStyle = computed(() => ({
  transform: `translateX(${props.away ? '-140%' : '0'})`,
}))

const crouchStyle = computed(() => ({
  transform: `translateY(${crouch.value * 12}px) scaleY(${1 - crouch.value * 0.15})`,
}))

const flipperStyle = computed(() => ({
  transform: `perspective(600px) rotateY(${turned.value ? 180 : 0}deg)`,
}))
</script>

<template>
  <div class="scene">
    <div class="exit" :style="exitStyle">
      <div class="crouch" :style="crouchStyle">
        <div class="flipper" :style="flipperStyle">
          <svg class="layer front" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="112" rx="55" ry="60" fill="#7ec8a9" />
            <circle cx="72" cy="60" r="13" fill="#7ec8a9" />
            <circle cx="128" cy="60" r="13" fill="#7ec8a9" />
            <ellipse cx="100" cy="128" rx="34" ry="38" fill="#a8dcc0" />
            <ellipse cx="66" cy="112" rx="8" ry="6" fill="#f4a3a3" :opacity="blushOpacity" />
            <ellipse cx="134" cy="112" rx="8" ry="6" fill="#f4a3a3" :opacity="blushOpacity" />
            <ellipse cx="80" cy="95" rx="7" :ry="eyeRy" fill="#ffffff" />
            <ellipse cx="120" cy="95" rx="7" :ry="eyeRy" fill="#ffffff" />
            <circle cx="80" :cy="95 + pupilDy" r="3.5" fill="#2f4f43" />
            <circle cx="120" :cy="95 + pupilDy" r="3.5" fill="#2f4f43" />
            <line
              x1="70"
              y1="80"
              x2="90"
              y2="80"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
              :transform="`rotate(${browTilt} 80 80)`"
            />
            <line
              x1="110"
              y1="80"
              x2="130"
              y2="80"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
              :transform="`rotate(${-browTilt} 120 80)`"
            />
            <path
              :d="mouthPath"
              fill="none"
              stroke="#2f4f43"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
          <svg class="layer back" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="112" rx="55" ry="60" fill="#7ec8a9" />
            <circle cx="72" cy="60" r="13" fill="#7ec8a9" />
            <circle cx="128" cy="60" r="13" fill="#7ec8a9" />
            <path
              d="M 100 62 q 10 -16 24 -8 q 12 7 2 16"
              fill="none"
              stroke="#5da88b"
              stroke-width="4"
              stroke-linecap="round"
            />
            <ellipse cx="100" cy="160" rx="14" ry="10" fill="#a8dcc0" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene {
  width: 200px;
  height: 200px;
  overflow: hidden;
}

.exit,
.crouch,
.flipper {
  width: 100%;
  height: 100%;
}

.exit {
  transition: transform 1s ease;
}

.crouch {
  transform-origin: bottom center;
  transition: transform 0.6s ease;
}

.flipper {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.layer {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}

.back {
  transform: rotateY(180deg);
}
</style>
