<script setup lang="ts">
import { computed } from 'vue'
import { taskTiming, type TamagotchiTask } from '../tamagotchi'
import { PALETTE } from '../pixel/palette'
import { formatDuration, m, messages } from '../i18n'

const props = defineProps<{ task: TamagotchiTask; now: number }>()

const timing = computed(() => taskTiming(props.task, props.now))
const fraction = computed(() =>
  timing.value.total === 0 ? 0 : Math.min(1, timing.value.elapsed / timing.value.total),
)
const fillWidth = computed(() => `${fraction.value * 100}%`)
const label = computed(() =>
  m(messages.progressOf)(formatDuration(timing.value.elapsed), formatDuration(timing.value.total)),
)
</script>

<template>
  <span class="task-progress">
    <div class="bar">
      <div class="frame" :style="{ background: PALETTE.x }"></div>
      <div class="bevel" :style="{ background: PALETTE.e }"></div>
      <div class="track" :style="{ background: PALETTE.q }">
        <div class="fill" :style="{ width: fillWidth, background: PALETTE.O }"></div>
      </div>
    </div>
    <span class="label">{{ label }}</span>
  </span>
</template>

<style scoped>
.task-progress {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.bar {
  position: relative;
  width: 100%;
  height: 14px;
}

.frame,
.bevel {
  position: absolute;
  clip-path: polygon(
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px),
    0 2px,
    2px 2px
  );
}

.frame {
  inset: 0;
}

.bevel {
  inset: 2px;
}

.track {
  position: absolute;
  inset: 4px;
}

.fill {
  height: 100%;
}

.label {
  display: block;
  margin: 4px 0 0;
  font-size: 12px;
  text-align: center;
  color: var(--tg-hint);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
</style>
