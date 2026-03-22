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
    </div>
  </div>
</template>
<script setup lang="ts">
import { formatAxis,useAccelerometer } from '@/hooks/useAccelerometer';
const { acceleration, statusText, permissionState, requestPermissionAndStart } = useAccelerometer();
</script>
