<template>
  <main class="flex flex-row bg-zinc-950 w-screen h-screen">
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
        class="shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out"
        :class="shownUI.chat.shown ? 'h-12' : 'h-0'">
        <div
          class="border-b border-border h-12 transition-transform duration-300 ease-in-out"
          :class="shownUI.chat.shown ? 'translate-y-0' : '-translate-y-full'">
          <div class="w-full h-full min-w-0 flex items-center justify-start text-md font-mono text-zinc-200">
            <p class="block min-w-0 w-full max-w-full truncate px-4">
              Message...
            </p>
          </div>
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
        <div
          v-if="!shownUI.video.shown && !shownUI.console.shown && !shownUI.armController.shown"
          class="grow w-0 overflow-hidden grid place-content-center text-zinc-200 text-4xl">
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
import ArmController from '@/components/armController.vue';
import ControllerLeft from '@/components/controller_left.vue';
import ControllerRight from '@/components/controller_right.vue';
import LiveVideo from '@/components/live_video.vue';
import { Icon } from '@iconify/vue';
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';

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
  controller: { icon: 'bi:controller', shown: true, available: true },
  chat: { icon: 'bi:chat-left-dots', shown: true, available: true },
  video: { icon: 'fa6-solid:video', shown: true, available: true },
  console: { icon: 'bi:terminal', shown: false, available: true },
  armController: { icon: 'streamline-ultimate:factory-industrial-robot-arm-1-bold', shown: false, available: true },
  settings: { icon: 'bi:gear-wide-connected', shown: false, available: true }
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