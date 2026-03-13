<template>
  <main class="flex flex-row gap-4 p-4 bg-black w-screen h-screen">
    <div class="flex flex-col gap-4 items-center basis-40">
      <div class="p-2 flex flex-col gap-4 w-full">
        <TriggerButton
          name="LB"
          v-model:clicked="controls.LB"
          class="w-full -mt-2"/>
        <div class="relative w-full aspect-square">
          <CircleButton
            v-model:clicked="controls.UP"
            name="↑"
            class="absolute top-0 left-1/2 -translate-x-1/2"/>
          <CircleButton
            v-model:clicked="controls.LEFT"
            name="←"
            class="absolute top-1/2 -translate-y-1/2 left-0"/>
          <CircleButton
            v-model:clicked="controls.RIGHT"
            name="→"
            class="absolute top-1/2 -translate-y-1/2 right-0"/>
          <CircleButton
            v-model:clicked="controls.DOWN"
            name="↓"
            class="absolute bottom-0 left-1/2 -translate-x-1/2"/>
        </div>
      </div>
      <Stick
        v-model:position="controls.leftStick"/>
    </div>
    <div class="grow min-w-0 flex flex-col gap-2 items-center">
      <Video class="grow -mt-2"/>
      <div class="flex flex-row gap-2 w-full items-center">
        <DebugConsole
          :ros
          class="grow"/>
        <div class="mt-1.5">
          <Settings/>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-4 items-center basis-40">
      <div class="p-2 flex flex-col gap-4 w-full">
        <TriggerButton
          name="RB"
          v-model:clicked="controls.RB"
          class="w-full -mt-2"/>
        <div class="relative w-full aspect-square">
          <CircleButton
            v-model:clicked="controls.Y"
            name="Y"
            class="absolute top-0 left-1/2 -translate-x-1/2"/>
          <CircleButton
            v-model:clicked="controls.X"
            name="X"
            class="absolute top-1/2 -translate-y-1/2 left-0"/>
          <CircleButton
            v-model:clicked="controls.B"
            name="B"
            class="absolute top-1/2 -translate-y-1/2 right-0"/>
          <CircleButton
            v-model:clicked="controls.A"
            name="A"
            class="absolute bottom-0 left-1/2 -translate-x-1/2"/>
        </div>
      </div>
      <Stick
        v-model:position="controls.rightStick"/>
    </div>
  </main>
</template>
<script setup lang="ts">
import CircleButton from "../components/circleButton.vue";
import TriggerButton from "../components/triggerButton.vue";
import Stick from "../components/stick.vue";

import { reactive, ref } from "vue";
import { createRos } from "../api/ros.ts"
import TopicNameSelector from "../components/topicNameSelector.vue";
import Video from "../components/video.vue"
import type { Control } from "../model/control.ts";
import { createControllerTopicInterval } from "../utils/createControllerTopicInterval.ts";
import DebugConsole from "../components/debugConsole.vue";
import Settings from "../components/settings.vue";
import { onMounted } from "vue";
import { useLocalStorage } from "../utils/useLocalStorage.ts";

const { ros } = createRos()
const videoTopicName = ref("")

const controls = reactive<Control>({
  LB: false,
  RB: false,
  A: false,
  B: false,
  X: false,
  Y: false,
  UP: false,
  DOWN: false,
  LEFT: false,
  RIGHT: false,
  leftStick: {
    x: 0,
    y: 0
  },
  rightStick: {
    x: 0,
    y: 0
  }
})

onMounted(() => {
  const params = new URLSearchParams(location.search)
  const newWebSocketURL = params.get("websocket_url")
  if( newWebSocketURL ){
    const webSocketURL = useLocalStorage("WebSocketURL")
    if( webSocketURL.value === newWebSocketURL ) return
    webSocketURL.value = newWebSocketURL
    location.reload()
  }
})

createControllerTopicInterval(ros, 20, controls)
</script>