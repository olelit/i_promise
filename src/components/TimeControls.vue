<script setup lang="ts">
import { m, messages } from '../i18n'
import { TIME_SPEEDS, type TimeSpeed } from '../tamagotchi'

defineProps<{ speed: TimeSpeed }>()
const emit = defineEmits<{ select: [speed: TimeSpeed] }>()

function text(value: TimeSpeed): string {
  return value === 0 ? '⏸' : `${value}×`
}

function aria(value: TimeSpeed): string {
  return value === 0 ? m(messages.timePause) : `${value}×`
}
</script>

<template>
  <div class="time-controls" role="group" :aria-label="m(messages.time)">
    <button
      v-for="value in TIME_SPEEDS"
      :key="value"
      class="speed-button"
      :class="{ active: value === speed }"
      type="button"
      :aria-pressed="value === speed"
      :aria-label="aria(value)"
      @click="emit('select', value)"
    >
      {{ text(value) }}
    </button>
  </div>
</template>

<style scoped>
.time-controls {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--tg-secondary-bg);
}

.speed-button {
  min-width: 44px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--tg-hint);
  font-size: 14px;
  cursor: pointer;
}

.speed-button.active {
  background: var(--tg-button);
  color: var(--tg-button-text);
}
</style>
