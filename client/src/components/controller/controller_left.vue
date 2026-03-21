<template>
  <div class="w-40 h-full border-r border-border flex flex-col gap-6 pt-8">
    <div class="flex flex-col gap-2 px-4">
      <TriggerButton name="LR" v-model:clicked="leftTrigger" />
      <TriggerButton name="LB" v-model:clicked="leftBumper" />
    </div>
    <div class="grow flex flex-col items-center gap-8">
      <div class="pb-8">
        <div class="aspect-square w-16 relative">
          <CircleButton
            v-model:clicked="leftUp"
            name="↑"
            class="mt-4 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
          <CircleButton
            v-model:clicked="leftLeft"
            name="←"
            class="mt-4 absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"
          />
          <CircleButton
            v-model:clicked="leftRight"
            name="→"
            class="mt-4 absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2"
          />
          <CircleButton
            v-model:clicked="leftDown"
            name="↓"
            class="mt-4 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      </div>
      <Stick v-model:position="leftStick" />
    </div>
  </div>
</template>
<script setup lang="ts">
import Stick from './stick.vue'
import CircleButton from './circleButton.vue'
import TriggerButton from './triggerButton.vue'

const leftStick = defineModel<{
  x: number
  y: number
}>('leftStick', { required: true })

const leftTrigger = defineModel<boolean>('leftTrigger', { required: true })
const leftBumper = defineModel<boolean>('leftBumper', { required: true })
const leftUp = defineModel<boolean>('leftUp', { required: true })
const leftLeft = defineModel<boolean>('leftLeft', { required: true })
const leftRight = defineModel<boolean>('leftRight', { required: true })
const leftDown = defineModel<boolean>('leftDown', { required: true })
</script>
