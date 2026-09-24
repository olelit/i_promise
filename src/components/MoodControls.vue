<script setup lang="ts">
import { computed } from 'vue'
import { formatRemaining } from '../tamagotchi'
import { getWebApp } from '../telegram'

const props = defineProps<{
  remainingMs: number | null
  nextFeedMs: number | null
  blockReason: 'cooldown' | 'full' | null
}>()
const emit = defineEmits<{ feed: []; feedBlocked: [reason: 'cooldown' | 'full'] }>()
const webApp = getWebApp()

const feedLabel = computed(() => {
  if (props.blockReason === 'cooldown' && props.nextFeedMs !== null) {
    return `Покормить через ${formatRemaining(props.nextFeedMs)}`
  }
  if (props.blockReason === 'full') {
    return 'Сыт'
  }
  return 'ПОКОРМИТЬ'
})

function handleFeed(): void {
  emit('feed')
  webApp?.HapticFeedback.impactOccurred('light')
}

function handleWrapClick(): void {
  if (props.blockReason !== null) {
    emit('feedBlocked', props.blockReason)
  }
}
</script>

<template>
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      Он ушёл. Вернётся через {{ formatRemaining(remainingMs) }}
    </p>
    <div v-else class="feed-wrap" @click="handleWrapClick">
      <button class="feed" type="button" :disabled="blockReason !== null" @click.stop="handleFeed">
        {{ feedLabel }}
      </button>
    </div>
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

.away {
  margin: 0;
  color: var(--tg-hint);
  font-size: 15px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.feed-wrap {
  display: inline-flex;
}

.feed {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}

.feed:disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}
</style>
