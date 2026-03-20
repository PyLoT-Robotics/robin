<template>
  <div class="w-full h-full overflow-y-auto flex flex-col gap-8 text-zinc-200 text-xl py-4">
    <div class="flex flex-col gap-1 font-mono">
      <p class="px-2 text-lg">Camera Topic</p>
      <select
        v-model="cameraTopic"
        class="bg-zinc-900 text-zinc-200 px-2 py-1 border-y border-border outline-none">
        <option value="/camera/image_raw">/camera/image_raw</option>
        <option value="/camera/image_compressed">/camera/image_compressed</option>
      </select>
    </div>
    
    <div class="flex flex-col gap-1 font-mono">
      <p class="px-2 text-lg">Log Topic</p>
      <select
        v-model="logTopic"
        class="bg-zinc-900 text-zinc-200 px-2 py-1 border-y border-border outline-none">
        <option value="/log">/log</option>
        <option value="/log/compressed">/log/compressed</option>
      </select>
    </div>

    <div class="flex flex-col gap-1 font-mono">
      <p class="px-2 text-lg">WebSocket URL</p>
      <input
        v-model="webSocketUrl"
        type="text"
        class="bg-zinc-900 text-zinc-200 px-2 py-1 placeholder:text-zinc-400 border-y border-border outline-none"
        placeholder="ws://localhost:8765">
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const cameraTopicStorage = useLocalStorage("CameraTopic")
const logTopicStorage = useLocalStorage("LogTopic")
const webSocketUrlStorage = useLocalStorage("WebSocketURL")

const cameraTopic = computed({
  get: () => cameraTopicStorage.value ?? "/camera/image_raw",
  set: (value: string) => {
    cameraTopicStorage.value = value
  }
})

const logTopic = computed({
  get: () => logTopicStorage.value ?? "/log",
  set: (value: string) => {
    logTopicStorage.value = value
  }
})

const webSocketUrl = computed({
  get: () => webSocketUrlStorage.value ?? "",
  set: (value: string) => {
    webSocketUrlStorage.value = value
  }
})
</script>
