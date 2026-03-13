<template>
  <button
    @click="isOpen = true"
    class="flex flex-row justify-center items-center">
    <div class="rounded-full overflow-hidden border border-white flex flex-row items-center p-0.5 text-white">
      <div class="border border-white border-dotted size-6 rounded-full grid place-content-center">
        <Icon
          :icon="isVideo ? 'fa6-solid:video' : 'fa6-solid:hashtag'"
          class="text-[12px]"/>
      </div>
      <p class="px-2 pr-1">{{ selectedTopic || "(No Topic)" }}</p>
      <div class="size-6 rounded-full grid place-content-center">
        <Icon
          icon="fa6-solid:arrow-right-arrow-left"
          class="text-[12px]"/>
      </div>
    </div>
  </button>
  <Modal
    v-model:open="isOpen"
    title="Select Topic">
    <div
      v-if="topics.length > 0"
      class="w-full h-full overflow-x-hidden overflow-y-auto flex flex-col gap-2">
      <button
        v-for="topic in topics"
        @click="() => selectTopic(topic)"
        class="border text-left border-white border-dotted min-h-12 px-4 font-mono overflow-hidden whitespace-nowrap text-ellipsis">
        {{ topic }}
      </button>
    </div>
    <div
      v-else
      class="w-full h-full flex flex-col gap-6 items-center justify-center">
      <p class="text-4xl font-semibold">No Topics</p>
      <TriggerButton
        @click="isOpen = false"
        name="CLOSE"
        class="w-32"/>
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
import type { Ros } from "roslib";
import { useTopics } from "../hooks/useTopics";
import { ref, watch } from "vue";
import TriggerButton from "./triggerButton.vue";
import Modal from "./modal.vue";

const { ros, isVideo } = defineProps<{
  isVideo: boolean
  ros: Ros;
}>();

const isOpen = ref(false)
watch(isOpen, (value) => {
  if(value){
    updateTopics()
  }
})

const { topics, updateTopics } = useTopics(ros);

function selectTopic(topic: string){
  selectedTopic.value = topic
  isOpen.value = false
}

const selectedTopic = defineModel<string>({ required: true });
</script>
