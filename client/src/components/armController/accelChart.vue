<template>
    <div class="p-4 pt-0">
      <div class="rounded border border-zinc-700 bg-zinc-950 p-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-zinc-300">Realtime Acceleration Graph</h3>
          <button
            type="button"
            class="rounded border border-zinc-600 px-2 py-1 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-400 hover:bg-zinc-800"
            @click="showRawData = !showRawData"
          >
            {{ showRawData ? '生データ: 表示中' : '生データ: 非表示' }}
          </button>
        </div>
        <div class="h-72 w-full">
          <canvas ref="accelChartCanvas" class="h-full w-full" />
        </div>
      </div>
    </div>
</template>
<script setup lang="ts">
import { Chart, type ChartDataset } from 'chart.js/auto'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Vector = {
  x: number
  y: number
  z: number
}

const {
  acceleration
} = defineProps<{
  acceleration: Vector
}>()

const accelChartCanvas = ref<HTMLCanvasElement | null>(null)
const showRawData = ref(true)
let accelChart: Chart<'line', number[], string> | null = null
let sampleCount = 0
let sampleIntervalId: number | null = null

const MAX_POINTS = 100
const SAMPLE_HZ = 20

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
    }
  ]
}

function applyRawVisibility(): void {
  if (!accelChart) return
  for (let i = 0; i < 3; i += 1) {
    const dataset = accelChart.data.datasets[i]
    if (!dataset) continue
    dataset.hidden = !showRawData.value
  }
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

  applyRawVisibility()
}

function appendCurrentAccelerationSample(): void {
  if(!accelChart) return
  sampleCount += 1
  appendLabel(String(sampleCount))

  const datasetValues = [
    acceleration.x,
    acceleration.y,
    acceleration.z
  ]

  datasetValues.forEach((value, index) => {
    const dataset = accelChart?.data.datasets[index]
    if (!dataset) return
    appendWithLimit(dataset.data as number[], value)
  })

  accelChart.update('none')
}

watch(showRawData, () => {
  if (!accelChart) return
  applyRawVisibility()
  accelChart.update('none')
})

onMounted(() => {
  initChart()
  sampleIntervalId = window.setInterval(appendCurrentAccelerationSample, 1000 / SAMPLE_HZ)
})

onBeforeUnmount(() => {
  if (sampleIntervalId !== null) {
    window.clearInterval(sampleIntervalId)
    sampleIntervalId = null
  }
  accelChart?.destroy()
  accelChart = null
})
</script>