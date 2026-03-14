<template>
  <div class="basis-40 shrink-0 border-l border-border flex flex-col gap-6 pt-8">
    <div class="flex flex-col gap-2 px-4">
      <TriggerButton
        name="RR"
        v-model:clicked="rightButtons.trigger"/>
      <TriggerButton
        name="RB"
        v-model:clicked="rightButtons.bumper"/>
    </div>
    <div class="grow flex flex-col items-center gap-8">
      <div class="pb-8">
        <div class="aspect-square w-16 relative">
          <CircleButton
            v-model:clicked="rightButtons.up"
            name="↑"
            class="mt-4 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="rightButtons.left"
            name="←"
            class="mt-4 absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="rightButtons.right"
            name="→"
            class="mt-4 absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2"/>
          <CircleButton
            v-model:clicked="rightButtons.down"
            name="↓"
            class="mt-4 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"/>
        </div>
      </div>
      <Stick v-model:position="rightStick"/>
    </div>
  </div>
</template>
<script setup lang="ts">
import Stick from '@/components/stick.vue';
import CircleButton from './circleButton.vue';
import TriggerButton from './triggerButton.vue';

const rightStick = defineModel<{
  x: number
  y: number
}>("rightStick", { required: true })

const rightButtons = defineModel<{
  trigger: boolean
  bumper: boolean
  up: boolean
  left: boolean
  right: boolean
  down: boolean
}>("rightButtons", { required: true })
</script>