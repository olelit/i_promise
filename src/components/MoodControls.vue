<script setup lang="ts">
import { onMounted, onUnmounted, watchEffect } from 'vue'
import { getWebApp, isTelegram } from '../telegram'
import { formatRemaining, MOOD_MAX } from '../tamagotchi'

const props = defineProps<{ mood: number; remainingMs: number | null }>()
const emit = defineEmits<{ pet: []; setMood: [mood: number] }>()

const webApp = getWebApp()
const inTelegram = isTelegram()

function handlePet(): void {
  emit('pet')
  webApp?.HapticFeedback.impactOccurred('light')
}

function handleSlider(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  emit('setMood', value)
}

watchEffect(() => {
  if (!webApp) {
    return
  }
  if (props.remainingMs !== null) {
    webApp.MainButton.hide()
    return
  }
  webApp.MainButton.setText('Погладить')
  webApp.MainButton.show()
  if (props.mood >= MOOD_MAX) {
    webApp.MainButton.disable()
  } else {
    webApp.MainButton.enable()
  }
})

onMounted(() => {
  webApp?.MainButton.onClick(handlePet)
})

onUnmounted(() => {
  webApp?.MainButton.offClick(handlePet)
  webApp?.MainButton.hide()
})
</script>

<template>
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      Он ушёл. Вернётся через {{ formatRemaining(remainingMs) }}
    </p>
    <template v-else>
      <p class="hint">Настроение падает само. Погладь, чтобы поднять.</p>
      <button
        v-if="!inTelegram"
        class="pet"
        type="button"
        :disabled="mood >= MOOD_MAX"
        @click="handlePet"
      >
        Погладить
      </button>
    </template>
    <label v-if="!inTelegram" class="slider">
      <span>Настроение: {{ Math.round(mood) }}</span>
      <input type="range" min="-100" max="100" :value="mood" @input="handleSlider" />
    </label>
  </section>
</template>

<style scoped>
.controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.hint {
  margin: 0;
  color: var(--tg-hint);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.away {
  margin: 0;
  color: var(--tg-hint);
  font-size: 15px;
  text-align: center;
}

.pet {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}

.pet:disabled {
  opacity: 0.5;
  cursor: default;
}

.slider {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--tg-hint);
  font-size: 13px;
}

.slider input {
  width: 100%;
}
</style>
