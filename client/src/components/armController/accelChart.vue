<template>
    <div class="p-4 pt-0">
      <div class="rounded border border-zinc-700 bg-zinc-950 p-3">
        <h3 class="mb-2 text-sm font-semibold text-zinc-300">Realtime Acceleration Graph</h3>
        <div class="h-72 w-full">
          <canvas ref="accelChartCanvas" class="h-full w-full" />
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { Chart, type ChartDataset } from 'chart.js/auto'
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

type Vector = {
  x: number
  y: number
  z: number
}

const {
  acceleration,
  smoothedAcceleration,
} = defineProps<{
  acceleration: Vector
  smoothedAcceleration: Vector
}>()

const accelChartCanvas = ref<HTMLCanvasElement | null>(null)
let accelChart: Chart<'line', number[], string> | null = null
let sampleCount = 0

const MAX_POINTS = 100

function appendWithLimit(target: number[], value: number): void {
  target.push(value)
  if (target.length > MAX_POINTS) {
    target.shift()
  }
}

function appendLabel(label: string): void {
  if (!accelChart) return
  accelChart.data.labels?.push(label)
  if ((accelChart.data.labels?.length ?? 0) > MAX_POINTS) {
    accelChart.data.labels?.shift()
  }
}

function createDatasets(): ChartDataset<'line', number[]>[] {
  return [
    {
      label: 'Accel X',
      data: [],
      borderColor: '#60a5fa',
      backgroundColor: '#60a5fa',
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0.2,
    },
    {
      label: 'Accel Y',
      data: [],
      borderColor: '#34d399',
      backgroundColor: '#34d399',
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0.2,
    },
    {
      label: 'Accel Z',
      data: [],
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b',
      pointRadius: 0,
      borderWidth: 1.5,
      tension: 0.2,
    },
    {
      label: 'Smooth X',
      data: [],
      borderColor: '#3b82f6',
      backgroundColor: '#3b82f6',
      pointRadius: 0,
      borderDash: [6, 4],
      borderWidth: 1.5,
      tension: 0.2,
    },
    {
      label: 'Smooth Y',
      data: [],
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      pointRadius: 0,
      borderDash: [6, 4],
      borderWidth: 1.5,
      tension: 0.2,
    },
    {
      label: 'Smooth Z',
      data: [],
      borderColor: '#d97706',
      backgroundColor: '#d97706',
      pointRadius: 0,
      borderDash: [6, 4],
      borderWidth: 1.5,
      tension: 0.2,
    },
  ]
}

function initChart(): void {
  if (!accelChartCanvas.value) return

  accelChart = new Chart<'line', number[], string>(accelChartCanvas.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: createDatasets(),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
            color: '#a1a1aa',
          },
          grid: {
            color: '#27272a',
          },
        },
        y: {
          ticks: {
            color: '#a1a1aa',
          },
          grid: {
            color: '#27272a',
          },
          title: {
            display: true,
            text: 'm/s²',
            color: '#a1a1aa',
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: '#d4d4d8',
            boxWidth: 14,
            boxHeight: 3,
          },
        },
      },
    },
  })
}

watch(() => acceleration, (newVal) => {
  if(!accelChart) return
  sampleCount += 1
  appendLabel(String(sampleCount))

  const datasetValues = [
    newVal.x,
    newVal.y,
    newVal.z,
    smoothedAcceleration.x,
    smoothedAcceleration.y,
    smoothedAcceleration.z,
  ]

  datasetValues.forEach((value, index) => {
    const dataset = accelChart?.data.datasets[index]
    if (!dataset) return
    appendWithLimit(dataset.data as number[], value)
  })

  accelChart.update('none')
}, { deep: true })

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  accelChart?.destroy()
  accelChart = null
})
</script>