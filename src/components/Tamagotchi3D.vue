<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Clock,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { createCharacter, disposeObject, type Character } from '../three/character'
import { MOOD_MAX } from '../tamagotchi'

const props = defineProps<{ mood: number; away: boolean }>()
const emit = defineEmits<{ unsupported: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)

const BASE_TURN_SPEED = 4
const BASE_MOVE_SPEED = 3
const FRAME_MS = 33

let renderer: WebGLRenderer | undefined
let scene: Scene | undefined
let camera: PerspectiveCamera | undefined
let character: Character | undefined
let frame = 0
let running = false
let lastRender = 0
let elapsed = 0
let baseYaw = 0
let baseX = 0
let idleYaw = 0
let idleTargetYaw = 0
let nextTurnAt = 6
let turnBackAt = 9

const clock = new Clock()

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function applyMood(): void {
  if (!character) {
    return
  }
  const t = clamp(props.mood / MOOD_MAX, 0, 1)
  character.setMouth(t)
  character.leftEye.scale.y = 1 - (1 - t) * 0.35
  character.rightEye.scale.y = 1 - (1 - t) * 0.35
  character.leftBrow.rotation.z = (1 - t) * 0.35
  character.rightBrow.rotation.z = -(1 - t) * 0.35
  character.blushMaterial.opacity = t
  character.blushMaterial.visible = t > 0.05
}

function renderFrame(time: number): void {
  if (!running) {
    return
  }
  frame = requestAnimationFrame(renderFrame)
  if (time - lastRender < FRAME_MS) {
    return
  }
  const dt = Math.min(0.1, clock.getDelta())
  lastRender = time
  elapsed += dt

  const targetYaw = props.mood <= 0 ? Math.PI : 0
  baseYaw += (targetYaw - baseYaw) * Math.min(1, dt * BASE_TURN_SPEED)
  const targetX = props.away ? -3.5 : 0
  baseX += (targetX - baseX) * Math.min(1, dt * BASE_MOVE_SPEED)

  if (elapsed >= nextTurnAt) {
    idleTargetYaw = (Math.random() - 0.5) * 0.5
    nextTurnAt = elapsed + 5 + Math.random() * 4
    turnBackAt = elapsed + 2 + Math.random() * 2
  }
  if (elapsed >= turnBackAt) {
    idleTargetYaw = 0
  }
  idleYaw += (idleTargetYaw - idleYaw) * Math.min(1, dt * 1.5)

  const crouch = props.mood < 0 ? -props.mood / MOOD_MAX : 0
  const breathe = 1 + Math.sin(elapsed * 1.4) * 0.01

  if (character) {
    character.group.rotation.y = baseYaw + idleYaw
    character.group.rotation.z = Math.sin(elapsed * 0.9) * 0.04
    character.group.scale.y = (1 - crouch * 0.15) * breathe
    character.group.position.x = baseX
    character.group.position.y = -crouch * 0.12
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function stopLoop(): void {
  running = false
  cancelAnimationFrame(frame)
}

function startLoop(): void {
  if (running || !renderer) {
    return
  }
  running = true
  frame = requestAnimationFrame(renderFrame)
}

function handleVisibility(): void {
  if (document.visibilityState === 'hidden') {
    stopLoop()
  } else {
    startLoop()
  }
}

function handleContextLost(event: Event): void {
  event.preventDefault()
  stopLoop()
  emit('unsupported')
}

function start(): void {
  const element = canvas.value
  if (!element) {
    emit('unsupported')
    return
  }
  try {
    renderer = new WebGLRenderer({ canvas: element, antialias: true, alpha: true })
    element.addEventListener('webglcontextlost', handleContextLost)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(240, 240, false)
    renderer.setClearColor(0x000000, 0)

    scene = new Scene()
    camera = new PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.2, 3.6)
    camera.lookAt(0, 0.05, 0)

    scene.add(new HemisphereLight(0xffffff, 0x444444, 1.1))
    const sun = new DirectionalLight(0xffffff, 1.2)
    sun.position.set(2, 3, 4)
    scene.add(sun)

    character = createCharacter()
    scene.add(character.group)
    applyMood()

    clock.start()
    startLoop()
    document.addEventListener('visibilitychange', handleVisibility)
  } catch {
    renderer?.dispose()
    renderer = undefined
    emit('unsupported')
  }
}

watch(() => props.mood, applyMood)

onMounted(start)

onUnmounted(() => {
  stopLoop()
  document.removeEventListener('visibilitychange', handleVisibility)
  canvas.value?.removeEventListener('webglcontextlost', handleContextLost)
  if (character) {
    disposeObject(character.group)
  }
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <div class="scene">
    <canvas ref="canvas" class="canvas"></canvas>
  </div>
</template>

<style scoped>
.scene,
.canvas {
  width: 240px;
  height: 240px;
  display: block;
}
</style>
