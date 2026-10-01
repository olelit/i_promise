<script setup lang="ts">
import Modal from './Modal.vue'
import { m, messages } from '../i18n'

const emit = defineEmits<{ close: [] }>()
const bullets = m(messages.rulesBullets)
</script>

<template>
  <Modal :title="m(messages.rules)" @close="emit('close')">
    <ul class="rules">
      <li v-for="(line, index) in bullets" :key="index">{{ line }}</li>
    </ul>
    <button class="done" type="button" @click="emit('close')">{{ m(messages.gotIt) }}</button>
  </Modal>
</template>

<style scoped>
.rules {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.35;
}

.done {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 15px;
  cursor: pointer;
}
</style>
