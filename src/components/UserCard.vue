<script setup lang="ts">
import { computed } from 'vue'
import type { TelegramWebAppUser } from '../telegram'

const props = defineProps<{ user: TelegramWebAppUser }>()

const fullName = computed(() => {
  const parts = [props.user.first_name, props.user.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Без имени'
})

const initials = computed(() => fullName.value.slice(0, 1).toUpperCase())
</script>

<template>
  <section class="card">
    <img v-if="user.photo_url" class="avatar" :src="user.photo_url" :alt="fullName" />
    <div v-else class="avatar avatar--placeholder">{{ initials }}</div>
    <div class="info">
      <h2 class="name">
        {{ fullName }}
        <span v-if="user.is_premium" class="badge">premium</span>
      </h2>
      <p v-if="user.username" class="row">@{{ user.username }}</p>
      <p class="row">id: {{ user.id }}</p>
      <p v-if="user.language_code" class="row">lang: {{ user.language_code }}</p>
    </div>
  </section>
</template>

<style scoped>
.card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: var(--tg-secondary-bg);
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 28px;
  font-weight: 600;
}

.info {
  min-width: 0;
}

.name {
  margin: 0 0 4px;
  font-size: 18px;
  overflow-wrap: anywhere;
}

.badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--tg-button);
  color: var(--tg-button-text);
  font-size: 11px;
  vertical-align: middle;
}

.row {
  margin: 0;
  color: var(--tg-hint);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>
