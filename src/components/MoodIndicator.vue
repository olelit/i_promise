<script setup lang="ts">
import { computed } from 'vue'
import { MOOD_MAX, MOOD_MIN } from '../tamagotchi'

const props = defineProps<{ mood: number }>()

const fraction = computed(() =>
  Math.min(1, Math.max(0, (props.mood - MOOD_MIN) / (MOOD_MAX - MOOD_MIN))),
)
const hue = computed(() => 120 * Math.min(1, Math.max(0, props.mood / MOOD_MAX)))
const fillStyle = computed(() => ({
  width: `${fraction.value * 100}%`,
  background: `hsl(${hue.value}, 70%, 45%)`,
}))
</script>

<template>
  <div
    class="meter"
    role="meter"
    aria-label="Настроение"
    :aria-valuemin="MOOD_MIN"
    :aria-valuemax="MOOD_MAX"
    :aria-valuenow="Math.round(mood)"
  >
    <div class="fill" :style="fillStyle"></div>
  </div>
</template>

<style scoped>
.meter {
  width: 100%;
  max-width: 300px;
  height: 14px;
  border-radius: 7px;
  background: var(--tg-secondary-bg);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.6s ease, background 0.6s ease;
}
</style>
