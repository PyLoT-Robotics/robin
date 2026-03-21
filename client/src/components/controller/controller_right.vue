<template>
  <div class="w-40 h-full border-l border-border flex flex-col gap-6 pt-8">
    <div class="flex flex-col gap-2 px-4">
      <TriggerButton
        name="RR"
        v-model:clicked="rightTrigger"/>
      <TriggerButton
        name="RB"
        v-model:clicked="rightBumper"/>
    </div>
    <div class="grow flex flex-col items-center gap-8">
      <div class="pb-8">
        <div class="aspect-square w-16 relative">
          <CircleButton
            v-model:clicked="rightUp"
            name="↑"
            class="mt-4 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="rightLeft"
            name="←"
            class="mt-4 absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="rightRight"
            name="→"
            class="mt-4 absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="rightDown"
            name="↓"
            class="mt-4 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"/>
        </div>
      </div>
      <Stick v-model:position="rightStick"/>
    </div>
  </div>
</template>
<script setup lang="ts">
import Stick from './stick.vue';
import CircleButton from './circleButton.vue';
import TriggerButton from './triggerButton.vue';

const rightStick = defineModel<{
  x: number
  y: number
}>("rightStick", { required: true })

const rightTrigger = defineModel<boolean>("rightTrigger", { required: true })
const rightBumper = defineModel<boolean>("rightBumper", { required: true })
const rightUp = defineModel<boolean>("rightUp", { required: true })
const rightLeft = defineModel<boolean>("rightLeft", { required: true })
const rightRight = defineModel<boolean>("rightRight", { required: true })
const rightDown = defineModel<boolean>("rightDown", { required: true })
</script>