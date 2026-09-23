<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const props = defineProps<{ message: { text: string; id: number } | null }>()

const visible = ref(false)
let timer: number | undefined

watch(
  () => props.message,
  (message) => {
    if (timer !== undefined) {
      window.clearTimeout(timer)
    }
    if (message === null) {
      visible.value = false
      return
    }
    visible.value = true
    timer = window.setTimeout(() => {
      visible.value = false
    }, 4000)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer !== undefined) {
    window.clearTimeout(timer)
  }
})
</script>

<template>
  <Transition name="bubble">
    <p v-if="visible && message !== null" class="bubble">{{ message.text }}</p>
  </Transition>
</template>

<style scoped>
.bubble {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
  font-size: 14px;
  line-height: 1.3;
  max-width: 220px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--tg-secondary-bg);
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.9);
}
</style>
