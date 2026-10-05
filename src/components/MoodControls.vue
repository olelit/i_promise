<script setup lang="ts">
import { formatRemaining, m, messages } from '../i18n'

defineProps<{ remainingMs: number | null }>()
</script>

<template>
  <section class="controls">
    <p v-if="remainingMs !== null" class="away">
      {{ m(messages.away)(formatRemaining(remainingMs)) }}
    </p>
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
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
  font-size: 15px;
  text-align: center;
}
</style>
