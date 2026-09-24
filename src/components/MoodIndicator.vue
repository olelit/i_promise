<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'

const props = defineProps<{ mood: number; interactive?: boolean }>()
const emit = defineEmits<{ setMood: [mood: number] }>()

const fraction = computed(() =>
  Math.min(1, Math.max(0, (props.mood - MOOD_MIN) / (MOOD_MAX - MOOD_MIN))),
)
const hue = computed(() => 120 * Math.min(1, Math.max(0, props.mood / MOOD_MAX)))
const fillStyle = computed(() => ({
  width: `${fraction.value * 100}%`,
  background: `hsl(${hue.value}, 70%, 45%)`,
}))

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
      aria-label="Настроение"
      :aria-valuemin="MOOD_MIN"
      :aria-valuemax="MOOD_MAX"
      :aria-valuenow="Math.round(mood)"
    >
      <div class="fill" :style="fillStyle"></div>
    </div>
    <input
      v-if="interactive"
      class="range"
      type="range"
      :min="MOOD_MIN"
      :max="MOOD_MAX"
      step="1"
      :value="Math.round(mood)"
      aria-label="Настроение"
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
  width: 100%;
  height: 14px;
  border-radius: 7px;
  background: var(--tg-secondary-bg);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.2s ease, background 0.6s ease;
}

.range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
