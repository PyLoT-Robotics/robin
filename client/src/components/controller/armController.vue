<template>
  <div class="w-full h-full flex flex-col bg-zinc-900 text-zinc-100">
    <div class="border-b border-border px-4 py-3">
      <h2 class="text-lg font-semibold">6-Axis Sensor Monitor</h2>
      <p class="text-xs text-zinc-400">acceleration (m/s²) + gyroscope (deg/s)</p>
    </div>

    <div class="px-4 py-3 text-sm">
      <p class="text-zinc-300">Status: {{ statusText }}</p>
      <button
        v-if="permissionState === 'required'"
        class="mt-2 rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
        @click="requestPermissionAndStart"
      >
        Enable Motion Sensor
      </button>
    </div>

    <div class="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
      <div class="rounded border border-zinc-700 bg-zinc-950 p-3">
        <h3 class="mb-2 text-sm font-semibold text-zinc-300">Acceleration</h3>
        <p class="font-mono text-sm">X: {{ formatAxis(acceleration.x) }}</p>
        <p class="font-mono text-sm">Y: {{ formatAxis(acceleration.y) }}</p>
        <p class="font-mono text-sm">Z: {{ formatAxis(acceleration.z) }}</p>
      </div>
      <div class="rounded border border-zinc-700 bg-zinc-950 p-3">
        <h3 class="mb-2 text-sm font-semibold text-zinc-300">Gyroscope</h3>
        <p class="font-mono text-sm">X: {{ formatAxis(gyro.x) }}</p>
        <p class="font-mono text-sm">Y: {{ formatAxis(gyro.y) }}</p>
        <p class="font-mono text-sm">Z: {{ formatAxis(gyro.z) }}</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const acceleration = reactive({ x: 0, y: 0, z: 0 })
const gyro = reactive({ x: 0, y: 0, z: 0 })
const permissionState = ref<'unknown' | 'required' | 'granted' | 'denied' | 'unsupported'>(
  'unknown',
)
let isListening = false

const statusText = computed(() => {
  switch (permissionState.value) {
    case 'unsupported':
      return 'This browser/device does not support DeviceMotionEvent.'
    case 'required':
      return 'Permission required. Tap the button to enable motion sensor.'
    case 'denied':
      return 'Permission denied. Please allow Motion & Orientation access in browser settings.'
    case 'granted':
      return 'Receiving sensor values from your device.'
    default:
      return 'Checking sensor availability...'
  }
})

function formatAxis(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}

function handleMotion(event: DeviceMotionEvent): void {
  const accel = event.acceleration ?? event.accelerationIncludingGravity
  acceleration.x = accel?.x ?? 0
  acceleration.y = accel?.y ?? 0
  acceleration.z = accel?.z ?? 0

  const rotationRate = event.rotationRate
  gyro.x = rotationRate?.beta ?? 0
  gyro.y = rotationRate?.gamma ?? 0
  gyro.z = rotationRate?.alpha ?? 0
}

function startListening(): void {
  if (isListening || typeof window === 'undefined') return
  window.addEventListener('devicemotion', handleMotion)
  isListening = true
}

async function requestPermissionAndStart(): Promise<void> {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    permissionState.value = 'unsupported'
    return
  }

  const deviceMotionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }

  if (!deviceMotionCtor.requestPermission) {
    permissionState.value = 'granted'
    startListening()
    return
  }

  try {
    const result = await deviceMotionCtor.requestPermission()
    if (result === 'granted') {
      permissionState.value = 'granted'
      startListening()
      return
    }
    permissionState.value = 'denied'
  } catch {
    permissionState.value = 'denied'
  }
}

onMounted(() => {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    permissionState.value = 'unsupported'
    return
  }

  const deviceMotionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }

  if (deviceMotionCtor.requestPermission) {
    permissionState.value = 'required'
    return
  }

  permissionState.value = 'granted'
  startListening()
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined' || !isListening) return
  window.removeEventListener('devicemotion', handleMotion)
  isListening = false
})
</script>
