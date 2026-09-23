<script setup lang="ts">
import { computed } from 'vue'
import { formatRemaining } from '../tamagotchi'

const props = defineProps<{ remainingMs: number | null; nextFeedMs: number | null }>()
const emit = defineEmits<{ feed: [] }>()

const feedLabel = computed(() =>
  props.nextFeedMs === null ? 'ПОКОРМИТЬ' : `Покормить через ${formatRemaining(props.nextFeedMs)}`,
)

function handleFeed(): void {
  emit('feed')
}
</script>

<template>
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      Он ушёл. Вернётся через {{ formatRemaining(remainingMs) }}
    </p>
    <template v-else>
      <p class="hint">Настроение падает само. Покорми раз в день, чтобы поднять.</p>
      <button class="feed" type="button" :disabled="nextFeedMs !== null" @click="handleFeed">
        {{ feedLabel }}
      </button>
    </template>
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
}
</style>
