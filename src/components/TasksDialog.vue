<script setup lang="ts">
import { ref } from 'vue'
import type { TaskRecord, TaskStatus, TamagotchiTask } from '../tamagotchi'
import { formatDateTime, formatDuration, m, messages } from '../i18n'
import Modal from './Modal.vue'
import TaskProgress from './TaskProgress.vue'

defineProps<{
  task: TamagotchiTask | null
  now: number
  history: TaskRecord[]
}>()
const emit = defineEmits<{
  complete: []
  extend: []
  abandon: []
  newTask: []
  close: []
}>()

const confirming = ref(false)

const STATUS_LABELS = {
  done: messages.statusDone,
  abandoned: messages.statusAbandoned,
  overdue: messages.statusOverdue,
}

function statusLabel(status: TaskStatus): string {
  return m(STATUS_LABELS[status])
}

function handleAbandon(): void {
  if (!confirming.value) {
    confirming.value = true
    return
  }
  confirming.value = false
  emit('abandon')
}

function handleComplete(): void {
  confirming.value = false
  emit('complete')
}

function handleExtend(): void {
  confirming.value = false
  emit('extend')
}
</script>

<template>
  <Modal :title="m(messages.tasks)" @close="emit('close')">
    <template v-if="task !== null">
      <p class="description">{{ task.description }}</p>
      <TaskProgress :task="task" :now="now" />
      <div class="actions">
        <button class="primary" type="button" @click="handleComplete">{{ m(messages.done) }}</button>
        <button class="secondary" type="button" @click="handleExtend">{{ m(messages.extend) }}</button>
        <button class="danger" type="button" @click="handleAbandon">
          {{ confirming ? m(messages.abandonConfirm) : m(messages.abandon) }}
        </button>
      </div>
    </template>
    <p v-else class="hint">{{ m(messages.noActiveTask) }}</p>

    <button class="primary new-task" type="button" :disabled="task !== null" @click="emit('newTask')">
      {{ m(messages.newTask) }}
    </button>

    <section class="history">
      <h3 class="history-title">{{ m(messages.historyTitle) }}</h3>
      <p v-if="history.length === 0" class="hint">{{ m(messages.historyEmpty) }}</p>
      <ul v-else class="records">
        <li v-for="(record, index) in history" :key="`${record.finishedAt}-${index}`" class="record">
          <p class="record-description">{{ record.description }}</p>
          <p class="record-status">{{ statusLabel(record.status) }}</p>
          <p class="record-meta">
            {{ m(messages.planLabel)(m(messages.hoursShort)(record.hours)) }} ·
            {{ m(messages.factLabel)(formatDuration(record.finishedAt - record.startedAt)) }} ·
            {{ formatDateTime(record.finishedAt) }}
          </p>
        </li>
      </ul>
    </section>
  </Modal>
</template>

<style scoped>
.description {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.hint {
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

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.secondary {
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
}

.danger {
  background: var(--tg-danger);
  color: #ffffff;
}

.new-task {
  align-self: flex-start;
}

.history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-title {
  margin: 0;
  font-size: 15px;
}

.records {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
}

.record {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-description {
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.record-status {
  margin: 0;
  font-size: 13px;
  color: var(--tg-hint);
}

.record-meta {
  margin: 0;
  font-size: 13px;
  color: var(--tg-hint);
}
</style>
