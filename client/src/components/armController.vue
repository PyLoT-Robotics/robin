<template>
  <div class="w-full h-full flex flex-col bg-zinc-900 text-zinc-100">
    <div class="flex flex-col grow overflow-y-auto">
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
      <details class="mx-4 mb-3 rounded border border-zinc-700 bg-zinc-950">
        <summary class="cursor-pointer select-none px-3 py-2 text-sm text-zinc-300">Acceleration Graph</summary>
        <AccelChart
          :acceleration="acceleration"
        />
      </details>
      <details class="mx-4 mb-3 rounded border border-zinc-700 bg-zinc-950">
        <summary class="cursor-pointer select-none px-3 py-2 text-sm text-zinc-300">Velocity Graph</summary>
        <VelocityChart
          :velocity="velocity"
        />
      </details>
      <PositionVectorView
        :position="position"
        :orientation="orientation"
      />
    </div>
    <div class="basis-80 flex flex-row gap-2 p-2">
      <button
        class="grid place-content-center grow text-4xl select-none rounded"
        @pointerdown="startMove"
        @pointerup="stopMove"
        @pointercancel="stopMove"
        @pointerleave="stopMove"
        :class="{
          'bg-amber-600/40': !moveActive,
          'bg-amber-600': moveActive,
        }">
        Move
      </button>
      <button
        class="grid place-content-center px-6 text-lg select-none rounded bg-zinc-700 hover:bg-zinc-600"
        @click="resetPosition"
      >
        Reset
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import AccelChart from '@/components/armController/accelChart.vue'
import PositionVectorView from '@/components/armController/positionVectorView.vue'
import VelocityChart from '@/components/armController/velocityChart.vue'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const moveActive = ref(false)

function startMove(): void {
  moveActive.value = true
}

function stopMove(): void {
  moveActive.value = false
  velocity.x = 0
  velocity.y = 0
  velocity.z = 0
}

function resetPosition(): void {
  position.x = 0
  position.y = 0
  position.z = 0
  velocity.x = 0
  velocity.y = 0
  velocity.z = 0
}

const { acceleration: _acceleration, orientation, statusText, permissionState, requestPermissionAndStart } = useAccelerometer()

type Vector = {
  x: number
  y: number
  z: number
}

const acceleration = reactive<Vector>({ x: 0, y: 0, z: 0 })
const velocity = reactive<Vector>({ x: 0, y: 0, z: 0 })
const position = reactive<Vector>({ x: 0, y: 0, z: 0 })
const tps = 20
const dt = 1 / tps

const deadBandThreshold = 0.04
function applyDeadband(value: number){
  if (Math.abs(value) < deadBandThreshold) {
    return 0
  }
  return value
}

function rotateAccelerationByOrientation(accel: Vector): Vector {
  if (!orientation.available) {
    return accel
  }

  const alpha = orientation.alpha * Math.PI / 180
  const beta = orientation.beta * Math.PI / 180
  const gamma = orientation.gamma * Math.PI / 180

  const ca = Math.cos(alpha)
  const sa = Math.sin(alpha)
  const cb = Math.cos(beta)
  const sb = Math.sin(beta)
  const cg = Math.cos(gamma)
  const sg = Math.sin(gamma)

  const r11 = ca * cg - sa * sb * sg
  const r12 = -cb * sa
  const r13 = ca * sg + cg * sa * sb

  const r21 = cg * sa + ca * sb * sg
  const r22 = ca * cb
  const r23 = sa * sg - ca * cg * sb

  const r31 = -cb * sg
  const r32 = sb
  const r33 = cb * cg

  return {
    x: r11 * accel.x + r12 * accel.y + r13 * accel.z,
    y: r21 * accel.x + r22 * accel.y + r23 * accel.z,
    z: r31 * accel.x + r32 * accel.y + r33 * accel.z,
  }
}

function loop(){
  const rotated = rotateAccelerationByOrientation({
    x: _acceleration.x,
    y: _acceleration.y,
    z: _acceleration.z,
  })

  const accelX = rotated.x
  const accelY = rotated.y
  const accelZ = rotated.z

  const accelerationAlpha = 0.8
  acceleration.x = applyDeadband(accelX * accelerationAlpha + acceleration.x * (1 - accelerationAlpha))
  acceleration.y = applyDeadband(accelY * accelerationAlpha + acceleration.y * (1 - accelerationAlpha))
  acceleration.z = applyDeadband(accelZ * accelerationAlpha + acceleration.z * (1 - accelerationAlpha))

  if (moveActive.value) {
    velocity.x += acceleration.x * dt
    velocity.y += acceleration.y * dt
    velocity.z += acceleration.z * dt

    position.x += velocity.x * dt
    position.y += velocity.y * dt
    position.z += velocity.z * dt
  } else {
    velocity.x = 0
    velocity.y = 0
    velocity.z = 0
  }
}

let interval: number | null = null
onMounted(() => {
  interval = window.setInterval(loop, 1000 / tps)
})
onBeforeUnmount(() => {
  if (interval !== null) {
    window.clearInterval(interval)
    interval = null
  }
})
</script>