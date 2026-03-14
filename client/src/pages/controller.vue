<template>
  <main class="flex flex-row bg-zinc-950 w-screen h-screen">
    <ControllerLeft
      v-if="shownUI.controller.shown"
      v-model:leftStick="sticks.left"
      v-model:leftButtons="buttons.left"/>
    <div class="grow min-w-0 overflow-hidden flex flex-col">
      <div
        v-if="shownUI.chat.shown"
        class="border-b border-border basis-16">
        <div class="w-full h-full min-w-0 flex items-center justify-start text-xl font-mono text-zinc-200">
          <p class="block min-w-0 w-full max-w-full truncate px-4">
            Message...
          </p>
        </div>
      </div>
      <div class="grow h-0 flex flex-row">
        <div
          v-if="shownUI.video.shown"
          class="grow w-0 overflow-hidden">
          <LiveVideo/>
        </div>
        <div
          v-if="shownUI.console.shown"
          class="grow w-0 overflow-hidden text-zinc-200">
          <div class="w-full h-full flex flex-col overflow-y-auto">
            <p v-for="i in 20" :key="i" class="break-all">awiofjawiofejiaofejapiefwajoipefjoipaofjeiajoipfeoijaopfieapoiwefiaopwfeoijpaoijefjoiaoiawe</p>
          </div>
        </div>
        <div
          v-if="shownUI.armController.shown"
          class="grow w-0 overflow-hidden">
          <ArmController/>
        </div>
      </div>
      <div class="border-t border-border basis-16 flex justify-center">
        <button
          v-for="(button, key) in shownUI"
          :key
          class="px-4 border-x border-border grid place-content-center"
          @click="shownUI[key].shown = !shownUI[key].shown"
          :class="{
            'bg-zinc-600 text-zinc-900': button.shown,
            'text-zinc-400': !button.shown
          }">
          <Icon
            :icon="button.icon"
            class="text-3xl"/>
        </button>
        <button
          class="px-4 border-x border-border grid place-content-center">
          <Icon
            icon='bi:gear-wide-connected'
            class="text-zinc-400 text-3xl"/>
        </button>
      </div>
    </div>
    <ControllerRight
      v-if="shownUI.controller.shown"
      v-model:rightStick="sticks.right"
      v-model:rightButtons="buttons.right"/>
  </main>
</template>
<script setup lang="ts">
import ArmController from '@/components/armController.vue';
import ControllerLeft from '@/components/controller_left.vue';
import ControllerRight from '@/components/controller_right.vue';
import LiveVideo from '@/components/live_video.vue';
import { Icon } from '@iconify/vue';
import { reactive } from 'vue';

const shownUI = reactive<{
  [key: string]: {
    readonly icon: string
    shown: boolean
  }
}>({
  controller: { icon: 'bi:controller', shown: true },
  chat: { icon: 'bi:chat-left-dots', shown: true },
  video: { icon: 'fa6-solid:video', shown: true },
  console: { icon: 'bi:terminal', shown: false },
  armController: { icon: 'streamline-ultimate:factory-industrial-robot-arm-1-bold', shown: false }
})

const sticks = reactive({
  right: {
    x: 0,
    y: 0
  },
  left: {
    x: 0,
    y: 0
  }
})

const buttons = reactive({
  left: {
    trigger: false,
    bumper: false,
    up: false,
    left: false,
    right: false,
    down: false
  },
  right: {
    trigger: false,
    bumper: false,
    up: false,
    left: false,
    right: false,
    down: false
  }
})
</script>