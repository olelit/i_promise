<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TamagotchiTask } from '../tamagotchi'
import { formatRemaining, m, messages } from '../i18n'
import Modal from './Modal.vue'

const props = defineProps<{ task: TamagotchiTask; now: number }>()
const emit = defineEmits<{ complete: []; extend: []; abandon: []; close: [] }>()

const confirming = ref(false)
const remaining = computed(() => Math.max(0, props.task.deadline - props.now))
const remainingLabel = computed(() =>
  remaining.value > 0
    ? m(messages.remaining)(formatRemaining(remaining.value))
    : m(messages.overdue),
)

function handleAbandon(): void {
  if (!confirming.value) {
    confirming.value = true
    return
  }
  emit('abandon')
}
</script>

<template>
  <Modal :title="m(messages.taskTitle)" @close="emit('close')">
    <p class="description">{{ task.description }}</p>
    <p class="row">{{ m(messages.taskHours)(task.hours) }}</p>
    <p class="row">{{ remainingLabel }}</p>
    <p v-if="task.extensions > 0" class="row">{{ m(messages.taskExtensions)(task.extensions) }}</p>
    <div class="actions">
      <button class="primary" type="button" @click="emit('complete')">{{ m(messages.done) }}</button>
      <button class="secondary" type="button" @click="emit('extend')">{{ m(messages.extend) }}</button>
      <button class="danger" type="button" @click="handleAbandon">
        {{ confirming ? m(messages.abandonConfirm) : m(messages.abandon) }}
      </button>
      <button class="secondary" type="button" @click="emit('close')">{{ m(messages.close) }}</button>
    </div>
  </Modal>
</template>

<style scoped>
.description {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.row {
  margin: 0;
  color: var(--tg-hint);
  font-size: 14px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.primary,
.secondary,
.danger {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}

.primary {
  background: var(--tg-button);
  color: var(--tg-button-text);
}

.secondary {
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
}

.danger {
  background: var(--tg-danger);
  color: #ffffff;
}
</style>
