<template>
  <div class="w-40 h-full border-r border-border flex flex-col gap-6 pt-8">
    <div class="flex flex-col gap-2 px-4">
      <TriggerButton
        name="LR"
        v-model:clicked="leftButtons.trigger"/>
      <TriggerButton
        name="LB"
        v-model:clicked="leftButtons.bumper"/>
    </div>
    <div class="grow flex flex-col items-center gap-8">
      <div class="pb-8">
        <div class="aspect-square w-16 relative">
          <CircleButton
            v-model:clicked="leftButtons.up"
            name="↑"
            class="mt-4 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="leftButtons.left"
            name="←"
            class="mt-4 absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="leftButtons.right"
            name="→"
            class="mt-4 absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="leftButtons.down"
            name="↓"
            class="mt-4 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"/>
        </div>
      </div>
      <Stick v-model:position="leftStick"/>
    </div>
  </div>
</template>
<script setup lang="ts">
import Stick from '@/components/stick.vue';
import CircleButton from './circleButton.vue';
import TriggerButton from './triggerButton.vue';

const leftStick = defineModel<{
  x: number
  y: number
}>("leftStick", { required: true })

const leftButtons = defineModel<{
  trigger: boolean
  bumper: boolean
  up: boolean
  left: boolean
  right: boolean
  down: boolean
}>("leftButtons", { required: true })
</script>