<script setup lang="ts">
import { computed } from 'vue'
import { formatRemaining, m, messages } from '../i18n'
import { getWebApp } from '../telegram'

const props = defineProps<{
  nextFeedMs: number | null
  blockReason: 'cooldown' | 'full' | null
}>()
const emit = defineEmits<{ feed: []; feedBlocked: [reason: 'cooldown' | 'full'] }>()
const webApp = getWebApp()

const label = computed(() => {
  if (props.blockReason === 'cooldown' && props.nextFeedMs !== null) {
    return m(messages.feedCooldown)(formatRemaining(props.nextFeedMs))
  }
  if (props.blockReason === 'full') {
    return m(messages.full)
  }
  return m(messages.feed)
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
  <div class="feed-wrap" @click="handleWrapClick">
    <button class="feed-button" type="button" :disabled="blockReason !== null" @click.stop="handleFeed">
      {{ label }}
    </button>
  </div>
</template>

<style scoped>
.feed-wrap {
  display: inline-flex;
}

.feed-button {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 16px;
  cursor: pointer;
}

.feed-button:disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}
</style>
