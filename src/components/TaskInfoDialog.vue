<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatRemaining, type TamagotchiTask } from '../tamagotchi'
import Modal from './Modal.vue'

const props = defineProps<{ task: TamagotchiTask; now: number }>()
const emit = defineEmits<{ complete: []; extend: []; abandon: []; close: [] }>()

const confirming = ref(false)
const remaining = computed(() => Math.max(0, props.task.deadline - props.now))
const remainingLabel = computed(() =>
  remaining.value > 0 ? `Осталось: ${formatRemaining(remaining.value)}` : 'Просрочено',
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
  <Modal title="Задача" @close="emit('close')">
    <p class="description">{{ task.description }}</p>
    <p class="row">Часов: {{ task.hours }}</p>
    <p class="row">{{ remainingLabel }}</p>
    <p v-if="task.extensions > 0" class="row">Продлений: {{ task.extensions }}</p>
    <div class="actions">
      <button class="primary" type="button" @click="emit('complete')">Выполнено</button>
      <button class="secondary" type="button" @click="emit('extend')">+1 час</button>
      <button class="danger" type="button" @click="handleAbandon">
        {{ confirming ? 'Точно отказаться?' : 'Отказаться' }}
      </button>
      <button class="secondary" type="button" @click="emit('close')">Закрыть</button>
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
