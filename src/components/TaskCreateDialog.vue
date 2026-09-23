<script setup lang="ts">
import { computed, ref } from 'vue'
import { TASK_DESCRIPTION_MAX, TASK_MAX_HOURS, TASK_MIN_HOURS } from '../tamagotchi'
import Modal from './Modal.vue'

const emit = defineEmits<{ start: [input: { hours: number; description: string }]; close: [] }>()

const hours = ref(TASK_MIN_HOURS)
const description = ref('')

const valid = computed(() => {
  const text = description.value.trim()
  return (
    text.length > 0 &&
    text.length <= TASK_DESCRIPTION_MAX &&
    Number.isInteger(hours.value) &&
    hours.value >= TASK_MIN_HOURS &&
    hours.value <= TASK_MAX_HOURS
  )
})

function submit(): void {
  if (!valid.value) {
    return
  }
  emit('start', { hours: hours.value, description: description.value.trim() })
}
</script>

<template>
  <Modal title="Начать задачу" @close="emit('close')">
    <label class="field">
      <span>Сколько часов</span>
      <input v-model.number="hours" type="number" :min="TASK_MIN_HOURS" :max="TASK_MAX_HOURS" step="1" />
    </label>
    <label class="field">
      <span>Краткое описание</span>
      <input
        v-model="description"
        type="text"
        :maxlength="TASK_DESCRIPTION_MAX"
        placeholder="Что нужно сделать?"
      />
    </label>
    <div class="actions">
      <button class="secondary" type="button" @click="emit('close')">Отмена</button>
      <button class="primary" type="button" :disabled="!valid" @click="submit">Начать</button>
    </div>
  </Modal>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--tg-hint);
}

.field input {
  padding: 10px 12px;
  border: 1px solid var(--tg-secondary-bg);
  border-radius: 10px;
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.primary,
.secondary {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}

.primary {
  background: var(--tg-button);
  color: var(--tg-button-text);
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.secondary {
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
}
</style>
