<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <section class="panel" role="dialog" aria-modal="true">
      <h2 class="title">{{ title }}</h2>
      <slot />
    </section>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.panel {
  width: 100%;
  max-width: 340px;
  padding: 16px;
  border-radius: 16px;
  background: var(--tg-bg);
  color: var(--tg-text);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 17px;
}
</style>
