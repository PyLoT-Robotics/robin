<template>
  <div class="w-full h-full overflow-y-auto flex flex-col gap-8 text-zinc-200 text-xl py-4">
    <div class="flex flex-col gap-1 font-mono">
      <p class="px-2 text-lg">Camera Topic</p>
      <select
        v-model="cameraTopic"
        class="bg-zinc-900 text-zinc-200 px-2 py-1 border-y border-border outline-none"
      >
        <option v-for="topic in topicsList" :key="`camera-${topic}`" :value="topic">
          {{ topic }}
        </option>
      </select>
    </div>

    <div class="flex flex-col gap-1 font-mono">
      <p class="px-2 text-lg">Log Topic</p>
      <select
        v-model="logTopic"
        class="bg-zinc-900 text-zinc-200 px-2 py-1 border-y border-border outline-none"
      >
        <option v-for="topic in topicsList" :key="`log-${topic}`" :value="topic">
          {{ topic }}
        </option>
      </select>
    </div>

    <div class="flex flex-col gap-1 font-mono">
      <p class="px-2 text-lg">Connection IP Address</p>
      <input
        ref="webSocketURLInput"
        v-model.lazy="connectionHost"
        type="text"
        class="bg-zinc-900 text-zinc-200 px-2 py-1 border-y border-border outline-none"
        placeholder="192.168.0.10"
        @focus="handleWebSocketURLFocus"
        @blur="handleWebSocketURLBlur"
      />
      <p class="px-2 text-sm text-zinc-400">
        WebSocket: wss://&lt;IP&gt;:9091 / VideoPublisher: https://&lt;IP&gt;:8081
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import {
  createTopic,
  defaultConnectionHost,
  getConnectionHostFromStorage,
  normalizeConnectionHost,
  type Topic,
} from '@/api/ros'
import { useTopicsList } from '@/hooks/useTopicsList'
import { ros } from '@/plugins/ros'

const cameraTopicStorage = useLocalStorage('CameraTopic')
const logTopicStorage = useLocalStorage('LogTopic')
const webSocketURLStorage = useLocalStorage('WebSocketURL')
const videoPublisherSubscribeTopicName = '/robin/video_publisher_subscribe_topic'

const { topicsList } = useTopicsList(ros)
let videoPublisherSubscribeTopic: Topic | null = null

function ensureVideoPublisherSubscribeTopic() {
  if (videoPublisherSubscribeTopic) {
    return videoPublisherSubscribeTopic
  }

  videoPublisherSubscribeTopic = createTopic(
    ros,
    videoPublisherSubscribeTopicName,
    'std_msgs/String',
  )
  return videoPublisherSubscribeTopic
}

function publishCameraTopic(value: string) {
  const topic = value.trim()
  if (!topic) {
    return
  }

  ensureVideoPublisherSubscribeTopic().publish({
    data: topic,
  })
}

const cameraTopic = computed({
  get: () => cameraTopicStorage.value ?? '/camera/image_raw',
  set: (value: string) => {
    cameraTopicStorage.value = value
  },
})

const logTopic = computed({
  get: () => logTopicStorage.value ?? '/log',
  set: (value: string) => {
    logTopicStorage.value = value
  },
})

const connectionHost = computed({
  get: () => getConnectionHostFromStorage(),
  set: (value: string) => {
    webSocketURLStorage.value = normalizeConnectionHost(value)
  },
})

const webSocketURLInput = ref<HTMLInputElement | null>(null)

let webSocketURLBeforeEdit = ''

function handleWebSocketURLFocus() {
  webSocketURLBeforeEdit = connectionHost.value
}

function handleWebSocketURLBlur() {
  if (!connectionHost.value) {
    connectionHost.value = defaultConnectionHost
  }

  if (connectionHost.value === webSocketURLBeforeEdit) {
    return
  }

  const confirmed = window.confirm('接続先IPが変更されました。画面を再読み込みしますか？')

  if (!confirmed) {
    webSocketURLInput.value?.focus()
    return
  }

  window.location.reload()
}

watch(
  cameraTopic,
  (value) => {
    publishCameraTopic(value)
  },
  { immediate: true },
)
</script>
