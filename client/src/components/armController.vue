<template>
  <div class="w-full h-full flex flex-col bg-zinc-900 text-zinc-100 overflow-y-auto">
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
    <AccelChart
      :acceleration="acceleration"
      :smoothedAcceleration="smoothedAcceleration"
    />
    <VelocityChart
      :velocity="velocity"
    />
  </div>
</template>
<script setup lang="ts">
import AccelChart from '@/components/armController/accelChart.vue'
import VelocityChart from '@/components/armController/velocityChart.vue'
import { useAccelerometer } from '@/hooks/useAccelerometer'
import { reactive, watch } from 'vue'

const { acceleration, statusText, permissionState, requestPermissionAndStart } = useAccelerometer()

type Vector = {
  x: number
  y: number
  z: number
}

const smoothedAcceleration = reactive<Vector>({ x: 0, y: 0, z: 0 })

watch(() => acceleration, (newVal) => {
    const alpha = 0.10
    const deadband = 0.04
    
    const applyDeadband = (value: number): number => {
        return Math.abs(value) < deadband ? 0 : value
    }
    
    smoothedAcceleration.x = applyDeadband(smoothedAcceleration.x + alpha * (newVal.x - smoothedAcceleration.x))
    smoothedAcceleration.y = applyDeadband(smoothedAcceleration.y + alpha * (newVal.y - smoothedAcceleration.y))
    smoothedAcceleration.z = applyDeadband(smoothedAcceleration.z + alpha * (newVal.z - smoothedAcceleration.z))
}, { deep: true })

const velocity = reactive<Vector>({ x: 0, y: 0, z: 0 })
const tps = 20
const accelBias =reactive<Vector>({ x: 0, y: 0, z: 0 })
const zeroAccelTicks = reactive<Vector>({ x: 0, y: 0, z: 0 })
const zeroVelocityAfterTicks = 5

let velocityInterval: number | null = setInterval(() => {
    const alpha = 0.95;
    const beta = 0.10;
    
    accelBias.x = (acceleration.x - smoothedAcceleration.x) * beta + accelBias.x * (1-beta)
    accelBias.y = (acceleration.y - smoothedAcceleration.y) * beta + accelBias.y * (1-beta)
    accelBias.z = (acceleration.z - smoothedAcceleration.z) * beta + accelBias.z * (1-beta)
    
    velocity.x += (smoothedAcceleration.x * alpha + (acceleration.x - accelBias.x) * (1 - alpha)) / tps
    velocity.y += (smoothedAcceleration.y * alpha + (acceleration.y - accelBias.y) * (1 - alpha)) / tps
    velocity.z += (smoothedAcceleration.z * alpha + (acceleration.z - accelBias.z) * (1 - alpha)) / tps

    velocity.x *= 0.99;
    velocity.y *= 0.99;
    velocity.z *= 0.99;

    zeroAccelTicks.x = smoothedAcceleration.x === 0 ? zeroAccelTicks.x + 1 : 0
    zeroAccelTicks.y = smoothedAcceleration.y === 0 ? zeroAccelTicks.y + 1 : 0
    zeroAccelTicks.z = smoothedAcceleration.z === 0 ? zeroAccelTicks.z + 1 : 0

    if (zeroAccelTicks.x >= zeroVelocityAfterTicks) velocity.x = 0
    if (zeroAccelTicks.y >= zeroVelocityAfterTicks) velocity.y = 0
    if (zeroAccelTicks.z >= zeroVelocityAfterTicks) velocity.z = 0
}, 1000 / tps)
</script>