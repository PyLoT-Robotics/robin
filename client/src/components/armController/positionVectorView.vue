<template>
  <div class="p-4 pt-0">
    <div class="rounded border border-zinc-700 bg-zinc-950 p-3">
      <h3 class="mb-2 text-sm font-semibold text-zinc-300">Position (Integrated)</h3>
      <p class="mb-3 text-xs text-zinc-400">
        X: <span class="text-red-400">{{ position.x.toFixed(3) }}</span>
        Y: <span class="ml-3 text-green-400">{{ position.y.toFixed(3) }}</span>
        Z: <span class="ml-3 text-blue-400">{{ position.z.toFixed(3) }}</span>
      </p>
      <div ref="container" class="h-72 w-full rounded border border-zinc-800" />
      <p class="mt-2 text-xs text-zinc-500">赤: X軸 / 緑: Y軸 / 青: Z軸</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Vector = {
  x: number
  y: number
  z: number
}

type ThreeVectorLike = {
  set: (x: number, y: number, z: number) => void
  normalize: () => ThreeVectorLike
}

type ThreeArrowLike = {
  setDirection: (direction: ThreeVectorLike) => void
  setLength: (length: number, headLength?: number, headWidth?: number) => void
}

type ThreeCameraLike = {
  aspect: number
  position: {
    set: (x: number, y: number, z: number) => void
  }
  lookAt: (x: number, y: number, z: number) => void
  updateProjectionMatrix: () => void
}

type ThreeRendererLike = {
  domElement: HTMLCanvasElement
  setPixelRatio: (ratio: number) => void
  setSize: (width: number, height: number) => void
  render: (scene: unknown, camera: unknown) => void
  dispose: () => void
}

type ThreeSceneLike = {
  background: unknown
  add: (object: unknown) => void
}

const { position } = defineProps<{
  position: Vector
}>()

const container = ref<HTMLDivElement | null>(null)

let scene: ThreeSceneLike | null = null
let camera: ThreeCameraLike | null = null
let renderer: ThreeRendererLike | null = null
let resizeObserver: ResizeObserver | null = null

let xArrow: ThreeArrowLike | null = null
let yArrow: ThreeArrowLike | null = null
let zArrow: ThreeArrowLike | null = null

const ORIGIN = new THREE.Vector3(0, 0, 0) as unknown
const MIN_LENGTH = 0.02
const SCALE = 3

function clampLength(value: number): number {
  return Math.max(MIN_LENGTH, Math.min(2, Math.abs(value) * SCALE))
}

function updateArrow(arrow: ThreeArrowLike | null, axis: 'x' | 'y' | 'z', value: number): void {
  if (!arrow) return

  const direction = new THREE.Vector3(0, 0, 0) as unknown as ThreeVectorLike
  const sign = value >= 0 ? 1 : -1

  if (axis === 'x') direction.set(sign, 0, 0)
  if (axis === 'y') direction.set(0, sign, 0)
  if (axis === 'z') direction.set(0, 0, sign)

  arrow.setDirection(direction.normalize())
  arrow.setLength(clampLength(value), 0.15, 0.08)
}

function renderScene(): void {
  if (!scene || !camera || !renderer) return
  renderer.render(scene, camera)
}

function applyPositionToArrows(): void {
  updateArrow(xArrow, 'x', position.x)
  updateArrow(yArrow, 'y', position.y)
  updateArrow(zArrow, 'z', position.z)
  renderScene()
}

function setupThree(): void {
  if (!container.value) return

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  scene = new THREE.Scene() as unknown as ThreeSceneLike
  scene.background = new THREE.Color('#0a0a0a')

  camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100) as unknown as ThreeCameraLike
  camera.position.set(2.6, 2.1, 2.6)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true }) as unknown as ThreeRendererLike
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)

  container.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight('#ffffff', 0.6)
  const directionalLight = new THREE.DirectionalLight('#ffffff', 0.6)
  directionalLight.position.set(2, 3, 2)

  const grid = new THREE.GridHelper(4, 8, '#27272a', '#18181b')
  const axes = new THREE.AxesHelper(1.1)

  xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), ORIGIN, MIN_LENGTH, '#ef4444', 0.15, 0.08) as unknown as ThreeArrowLike
  yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), ORIGIN, MIN_LENGTH, '#22c55e', 0.15, 0.08) as unknown as ThreeArrowLike
  zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), ORIGIN, MIN_LENGTH, '#3b82f6', 0.15, 0.08) as unknown as ThreeArrowLike

  scene.add(ambientLight)
  scene.add(directionalLight)
  scene.add(grid)
  scene.add(axes)
  scene.add(xArrow)
  scene.add(yArrow)
  scene.add(zArrow)

  resizeObserver = new ResizeObserver(() => {
    if (!container.value || !camera || !renderer) return
    const nextWidth = container.value.clientWidth
    const nextHeight = container.value.clientHeight
    camera.aspect = nextWidth / nextHeight
    camera.updateProjectionMatrix()
    renderer.setSize(nextWidth, nextHeight)
    renderScene()
  })
  resizeObserver.observe(container.value)

  applyPositionToArrows()
}

onMounted(() => {
  setupThree()
})

watch(
  () => ({ x: position.x, y: position.y, z: position.z }),
  () => {
    applyPositionToArrows()
  },
  { deep: false },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null

  if (renderer?.domElement && container.value?.contains(renderer.domElement)) {
    container.value.removeChild(renderer.domElement)
  }

  renderer?.dispose()
  renderer = null
  camera = null
  scene = null
  xArrow = null
  yArrow = null
  zArrow = null
})
</script>
