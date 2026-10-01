<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'
import { PALETTE } from '../pixel/palette'
import { m, messages } from '../i18n'

const props = defineProps<{ mood: number; interactive?: boolean }>()
const emit = defineEmits<{ setMood: [mood: number] }>()

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

function handleInput(event: Event): void {
  emit('setMood', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="meter-wrap">
    <div
      class="meter"
      role="meter"
      :aria-hidden="interactive ? 'true' : undefined"
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
    <input
      v-if="interactive"
      class="range"
      type="range"
      :min="MOOD_MIN"
      :max="MOOD_MAX"
      step="1"
      :value="Math.round(mood)"
      :aria-label="m(messages.mood)"
      @input="handleInput"
    />
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

.range {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  width: 100%;
  height: 44px;
  margin: 0;
  transform: translateY(-50%);
  opacity: 0;
  cursor: pointer;
}

.meter-wrap:focus-within .meter {
  outline: 2px solid var(--tg-button);
  outline-offset: 2px;
}
</style>
