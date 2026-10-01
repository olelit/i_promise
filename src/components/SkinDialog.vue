<script setup lang="ts">
import Modal from './Modal.vue'
import PixelSprite from './PixelSprite.vue'
import { characterMap } from '../pixel/character'
import { SKINS, skinColors } from '../pixel/skins'
import { m, messages, skinName } from '../i18n'
import type { SkinId } from '../tamagotchi'

defineProps<{ selected: SkinId }>()
const emit = defineEmits<{ select: [skin: SkinId]; close: [] }>()

const portrait = characterMap('happy', 0)
</script>

<template>
  <Modal :title="m(messages.skins)" @close="emit('close')">
    <div class="skins">
      <button
        v-for="skin in SKINS"
        :key="skin.id"
        class="skin"
        type="button"
        :class="{ selected: skin.id === selected }"
        :aria-pressed="skin.id === selected"
        @click="emit('select', skin.id)"
      >
        <svg class="preview" viewBox="0 0 48 48" aria-hidden="true">
          <PixelSprite :map="portrait" :palette="skinColors(skin.id)" />
        </svg>
        <span class="name">{{ skinName(skin.id) }}</span>
      </button>
    </div>
  </Modal>
</template>

<style scoped>
.skins {
  display: flex;
  gap: 10px;
}

.skin {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: var(--tg-secondary-bg);
  color: var(--tg-text);
  font-size: 14px;
  cursor: pointer;
}

.skin.selected {
  border-color: var(--tg-button);
}

.preview {
  width: 100%;
  max-width: 96px;
  height: auto;
  aspect-ratio: 1;
  display: block;
}

.name {
  text-align: center;
}
</style>
