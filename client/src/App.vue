<template>
  <main class="flex flex-row bg-zinc-950 w-dvw h-dvh">
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="shownUI.controller.shown ? 'w-40' : 'w-0'">
      <ControllerLeft
        class="transition-transform duration-300 ease-in-out"
        :class="shownUI.controller.shown ? 'translate-x-0' : '-translate-x-full'"
        v-model:leftStick="sticks.left"
        v-model:leftButtons="buttons.left"/>
    </div>
    <div class="grow min-w-0 overflow-hidden flex flex-col">
      <div
        v-if="status === 'error' || status === 'closed'"
        class="border-red-500 border-b text-red-400 bg-red-500/20 text-center py-2">
        Cannot Connect to ROS...
      </div>
      <div
        class="shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out"
        :class="shownUI.chat.shown ? 'h-12' : 'h-0'">
        <div
          class="border-b border-border h-12 transition-transform duration-300 ease-in-out"
          :class="shownUI.chat.shown ? 'translate-y-0' : '-translate-y-full'">
          <Message
            :ros/>
        </div>
      </div>
      <div
        class="grow h-0 flex"
        :class="{
          'flex-col': isPortrait
        }">
        <div
          v-if="shownUI.video.shown"
          class="grow overflow-hidden"
          :class="isPortrait ? 'h-0' : 'w-0'">
          <LiveVideo/>
        </div>
        <div
          v-if="shownUI.console.shown"
          class="grow overflow-hidden text-zinc-200"
          :class="isPortrait ? 'h-0' : 'w-0'">
          <Log
            :ros/>
        </div>
        <div
          v-if="shownUI.armController.shown"
          class="grow overflow-hidden"
          :class="isPortrait ? 'h-0' : 'w-0'">
          <ArmController/>
        </div>
        <div
          v-if="shownUI.map.shown"
          class="grow overflow-hidden"
          :class="isPortrait ? 'h-0' : 'w-0'">
          <Map
            :ros/>
        </div>
        <div
          v-if="shownUI.settings.shown"
          class="grow overflow-hidden"
          :class="isPortrait ? 'h-0' : 'w-0'">
          <Settings
            :ros/>
        </div>
        <div
          v-if="!shownUI.video.shown && !shownUI.console.shown && !shownUI.armController.shown && !shownUI.map.shown && !shownUI.settings.shown"
          class="grow overflow-hidden grid place-content-center text-zinc-200 text-4xl"
          :class="isPortrait ? 'h-0' : 'w-0'">
          <p>No UI is selected</p>
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
            'text-zinc-400': !button.shown,
            'hidden': !button.available
          }">
          <Icon
            :icon="button.icon"
            class="text-3xl"/>
        </button>
      </div>
    </div>
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="shownUI.controller.shown ? 'w-40' : 'w-0'">
      <ControllerRight
        class="transition-transform duration-300 ease-in-out"
        :class="shownUI.controller.shown ? 'translate-x-0' : 'translate-x-full'"
        v-model:rightStick="sticks.right"
        v-model:rightButtons="buttons.right"/>
    </div>
  </main>
</template>
<script setup lang="ts">
import ArmController from '@/components/controller/armController.vue';
import ControllerLeft from '@/components/controller/controller_left.vue';
import ControllerRight from '@/components/controller/controller_right.vue';
import LiveVideo from '@/components/live_video.vue';
import Settings from '@/components/settings.vue';
import Log from '@/components/log.vue';
import { Icon } from '@iconify/vue';
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { createRos } from './api/ros';
import Message from './components/message.vue';
import Map from '@/components/map.vue';

const isPortrait = ref(false);

const updateIsPortrait = () => {
  isPortrait.value = window.innerHeight > window.innerWidth;
};

onMounted(() => {
  updateIsPortrait();
  window.addEventListener('resize', updateIsPortrait);
  window.addEventListener('orientationchange', updateIsPortrait);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsPortrait);
  window.removeEventListener('orientationchange', updateIsPortrait);
});

watch(isPortrait, (changedToPortrait) => {
  if(changedToPortrait){
    shownUI.controller.shown = false
    shownUI.controller.available = false
  }else{
    shownUI.controller.available = true
  }
})

const shownUI = reactive({
  controller: { icon: 'bi:controller', shown: false, available: true },
  chat: { icon: 'bi:chat-left-dots', shown: false, available: true },
  video: { icon: 'fa6-solid:video', shown: false, available: true },
  console: { icon: 'bi:terminal', shown: false, available: true },
  map: { icon: 'bi:map', shown: false, available: true },
  armController: { icon: 'streamline-ultimate:factory-industrial-robot-arm-1-bold', shown: false, available: true },
  settings: { icon: 'bi:gear-wide-connected', shown: false, available: true },
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

const { ros, status } = createRos()
</script>