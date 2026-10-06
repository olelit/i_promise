<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'
import { PALETTE } from '../pixel/palette'
import { m, messages } from '../i18n'

const props = defineProps<{ mood: number }>()

const SEGMENTS = 20

const fraction = computed(() =>
  Math.min(1, Math.max(0, (props.mood - MOOD_MIN) / (MOOD_MAX - MOOD_MIN))),
)
const lit = computed(() => Math.round(fraction.value * SEGMENTS))
const segments = computed(() =>
  Array.from({ length: SEGMENTS }, (_, index) => {
    const value = MOOD_MIN + ((index + 0.5) * (MOOD_MAX - MOOD_MIN)) / SEGMENTS
    return value < 0 ? PALETTE.r : value <= 50 ? PALETTE.S : PALETTE.T
  }),
)
</script>

<template>
  <div class="meter-wrap">
    <div
      class="meter"
      role="meter"
      :aria-label="m(messages.mood)"
      :aria-valuemin="MOOD_MIN"
      :aria-valuemax="MOOD_MAX"
      :aria-valuenow="Math.round(mood)"
    >
      <div class="frame" :style="{ background: PALETTE.x }"></div>
      <div class="bevel" :style="{ background: PALETTE.e }"></div>
      <div class="track" :style="{ background: PALETTE.q }">
        <span
          v-for="(color, index) in segments"
          :key="index"
          class="segment"
          :style="index < lit ? { background: color } : undefined"
        ></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meter-wrap {
  position: relative;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.meter {
  position: relative;
  width: 100%;
  height: 22px;
}

.frame,
.bevel {
  position: absolute;
  clip-path: polygon(
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px),
    0 2px,
    2px 2px
  );
}

.frame {
  inset: 0;
}

.bevel {
  inset: 2px;
}

.track {
  position: absolute;
  inset: 4px;
  display: flex;
  gap: 1px;
}

.segment {
  flex: 1;
}
</style>
