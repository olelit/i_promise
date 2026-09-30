<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { PALETTE } from '../pixel/palette'

const props = defineProps<{ message: { text: string; id: number } | null }>()

const bubbleStyle = {
  '--bubble-frame': PALETTE.x,
  background: PALETTE.W,
  color: PALETTE.d,
  borderColor: PALETTE.x,
  boxShadow: `inset 0 0 0 2px ${PALETTE.e}`,
}

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
    <p v-if="visible && message !== null" class="bubble" :style="bubbleStyle">
      {{ message.text }}
    </p>
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
  border: 4px solid;
  border-radius: 0;
  font-size: 14px;
  line-height: 1.3;
  max-width: 220px;
  text-align: center;
}

.bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 9px;
  background: var(--bubble-frame);
  clip-path: polygon(
    0 0,
    100% 0,
    100% 33.3%,
    87.5% 33.3%,
    87.5% 66.6%,
    62.5% 66.6%,
    62.5% 100%,
    37.5% 100%,
    37.5% 66.6%,
    12.5% 66.6%,
    12.5% 33.3%,
    0 33.3%
  );
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
