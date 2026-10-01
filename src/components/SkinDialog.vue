<script setup lang="ts">
import Modal from './Modal.vue'
import PixelSprite from './PixelSprite.vue'
import { characterMap } from '../pixel/character'
import { SKINS, skinColors } from '../pixel/skins'
import type { SkinId } from '../tamagotchi'

defineProps<{ selected: SkinId }>()
const emit = defineEmits<{ select: [skin: SkinId]; close: [] }>()

const portrait = characterMap('happy', 0)
</script>

<template>
  <Modal title="Скины" @close="emit('close')">
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
        <span class="name">{{ skin.name }}</span>
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
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
  width: 96px;
  height: 96px;
  display: block;
}

.name {
  text-align: center;
}
</style>
