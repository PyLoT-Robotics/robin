<template>
  <div
    class="w-full h-full min-w-0 flex items-center justify-start text-md font-mono text-zinc-200"
  >
    <p class="block min-w-0 w-full max-w-full truncate px-4">
      {{ latestLine }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { createTopic, type Ros } from '@/api/ros'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { Topic } from 'roslib'
import { onBeforeUnmount, ref, watch } from 'vue'

const { ros } = defineProps<{ ros: Ros }>()

const latestLine = ref('Waiting for messages...')
const activeTopic = useLocalStorage('LogTopic')

let subscriber: Topic | null = null

function stopSubscribe() {
  if (!subscriber) {
    return
  }
  subscriber.unsubscribe()
  subscriber = null
}

function resolveTopicType(topicName: string) {
  return new Promise<string>((resolve) => {
    ros.getTopicType(topicName, (topicType) => {
      resolve(topicType && topicType.length > 0 ? topicType : 'std_msgs/String')
    })
  })
}

async function startSubscribe(topicName: string) {
  stopSubscribe()

  if (!topicName) {
    latestLine.value = 'No topic selected'
    return
  }

  latestLine.value = 'Waiting for messages...'

  try {
    const topicType = await resolveTopicType(topicName)
    subscriber = createTopic(ros, topicName, topicType)

    subscriber.subscribe((message) => {
      latestLine.value = `[${new Date().toLocaleTimeString()}] ${topicName} ${JSON.stringify(message)}`
    })
  } catch (error) {
    latestLine.value = `Failed to subscribe: ${String(error)}`
  }
}

watch(
  activeTopic,
  (newTopic) => {
    startSubscribe(newTopic)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopSubscribe()
})
</script>
