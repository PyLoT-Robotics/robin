<template>
  <div class="w-full">
    <button
      @click="isOpen = true"
      class="w-full rounded-lg overflow-hidden border border-white flex flex-row items-center p-0.5 text-white">
      <div class="border border-white border-dotted size-6 rounded-md grid place-content-center">
        <Icon
          icon="fa6-solid:terminal"
          class="text-[12px]"/>
      </div>
      <p class="min-w-0 shrink max-w-full first-letter:px-2 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis">{{ logs[0] }}</p>
    </button>
    <div class="h-3 w-full rounded-lg border border-white border-dotted border-t-0 rounded-t-none -mt-2"/>
  </div>
  <Modal
    v-model:open="isOpen"
    title="Logs">
    <div
      v-if="logs.length > 0"
      class="w-full h-full overflow-x-hidden overflow-y-auto flex flex-col gap-0.5">
      <div
        v-for="log in logs"
        class="border-y text-left border-white border-dotted min-h-6 px-2 text-sm font-mono break-words w-full">
        {{ log }}
      </div>
    </div>
    <div
      v-else
      class="w-full h-full flex flex-col gap-6 items-center justify-center">
      <p class="text-4xl font-semibold">No Logs</p>
    </div>
    <div class="flex flex-row items-center gap-4 justify-center">
      <TopicNameSelector
        :ros
        :is-video="false"
        v-model="topicName"/>
      <TriggerButton
        @click="isOpen = false"
        name="CLOSE"
        class="w-32 translate-y-1"/>
    </div>
  </Modal>
</template>
<style>
.bg-stripe {
  background-image: repeating-linear-gradient(45deg, rgba(100, 100, 100, 1), rgba(100, 100, 100, 1) 2px, black 2px, black 8px);
}
</style>
<script setup lang="ts">
import { Icon } from "@iconify/vue"
import * as RosLib from "roslib";
import { onMounted, reactive, watch, ref } from "vue";
import TriggerButton from "./triggerButton.vue";
import TopicNameSelector from "./topicNameSelector.vue";
import Modal from "./modal.vue";

const isOpen = ref(false)
const topicName = ref("")

const { ros } = defineProps<{
    ros: RosLib.Ros
}>()

const topic = ref<RosLib.Topic>()
watch(topicName, async (newTopicName) => {
  const messageType = await new Promise<string>((resolve) => ros.getTopicType(newTopicName, resolve))
  topic.value = new RosLib.Topic({
    name: newTopicName,
    ros,
    messageType
  })
})

const logs = reactive<string[]>([])

const maxLogAmount = 100
watch(logs, () => {
    if(logs.length > maxLogAmount){
      logs.splice(maxLogAmount, logs.length-maxLogAmount)
    }
})

onMounted(() => {
  watch(topic, (topicSubscriber) => {
    if( !topicSubscriber ) return
    
    topicSubscriber.subscribe((message) => {
      logs.unshift(JSON.stringify(message))
    })
  })
})
</script>