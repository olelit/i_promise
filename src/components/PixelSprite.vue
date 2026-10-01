<script setup lang="ts">
import { computed } from 'vue'
import { PALETTE } from '../pixel/palette'
import type { PixelMap } from '../pixel/canvas'

const props = defineProps<{
  map: PixelMap
  x?: number
  y?: number
  scale?: number
  opacity?: number
  palette?: Record<string, string>
}>()

const paths = computed(() => {
  const byChar = new Map<string, string[]>()
  props.map.rows.forEach((row, y) => {
    if (import.meta.env.DEV && row.length !== props.map.width) {
      throw new Error(`Pixel map row ${y} is ${row.length} wide, expected ${props.map.width}`)
    }
    let x = 0
    while (x < props.map.width) {
      const ch = row[x]
      if (ch === '.') {
        x += 1
        continue
      }
      let end = x
      while (end + 1 < props.map.width && row[end + 1] === ch) {
        end += 1
      }
      const color = props.palette?.[ch] ?? PALETTE[ch]
      if (import.meta.env.DEV && color === undefined) {
        throw new Error(`Unknown palette character "${ch}"`)
      }
      const segments = byChar.get(ch) ?? []
      segments.push(`M${x} ${y}h${end - x + 1}v1H${x}z`)
      byChar.set(ch, segments)
      x = end + 1
    }
  })
  return [...byChar.entries()].map(([ch, segments]) => ({
    key: ch,
    d: segments.join(''),
    fill: props.palette?.[ch] ?? PALETTE[ch],
  }))
})

const transform = computed(
  () => `translate(${props.x ?? 0} ${props.y ?? 0}) scale(${props.scale ?? 1})`,
)
</script>

<template>
  <g
    class="pixel-sprite"
    :transform="transform"
    :opacity="opacity"
    shape-rendering="crispEdges"
  >
    <path v-for="path in paths" :key="path.key" :d="path.d" :fill="path.fill" />
  </g>
</template>
