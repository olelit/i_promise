<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { getWebApp, isTelegram } from '../telegram'

const webApp = getWebApp()
const inTelegram = isTelegram()
const count = ref(0)

function increment(): void {
  count.value += 1
  webApp?.HapticFeedback.impactOccurred('light')
}

function reset(): void {
  count.value = 0
}

function syncBackButton(): void {
  if (!webApp) {
    return
  }
  if (count.value > 0) {
    webApp.BackButton.show()
  } else {
    webApp.BackButton.hide()
  }
}

watch(count, syncBackButton)

onMounted(() => {
  if (!webApp) {
    return
  }
  webApp.MainButton.setText('Нажми меня')
  webApp.MainButton.onClick(increment)
  webApp.MainButton.show()
  webApp.BackButton.onClick(reset)
})

onUnmounted(() => {
  if (!webApp) {
    return
  }
  webApp.MainButton.offClick(increment)
  webApp.MainButton.hide()
  webApp.BackButton.offClick(reset)
  webApp.BackButton.hide()
})
</script>

<template>
  <section class="controls">
    <p class="count">Нажатий: <strong>{{ count }}</strong></p>
    <p class="hint">
      В Telegram кнопка «Нажми меня» — это MainButton внизу экрана, нажатие даёт
      haptic feedback. BackButton появляется, когда счётчик больше нуля, и
      сбрасывает его.
    </p>
    <button v-if="!inTelegram" class="fallback" type="button" @click="increment">
      Нажми меня (браузерный режим)
    </button>
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

.count {
  margin: 0;
  font-size: 18px;
}

.hint {
  margin: 0;
  color: var(--tg-hint);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.fallback {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}
</style>
