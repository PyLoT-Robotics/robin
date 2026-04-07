<template>
  <main class="flex flex-row bg-zinc-950 w-dvw h-dvh">
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="controllerStatus.shown ? 'w-40' : 'w-0'"
    >
      <ControllerLeft
        class="transition-transform duration-300 ease-in-out"
        :class="controllerStatus.shown ? 'translate-x-0' : '-translate-x-full'"
        v-model:leftStick="control.leftStick"
        v-model:leftTrigger="control.LT"
        v-model:leftBumper="control.LB"
        v-model:leftUp="control.UP"
        v-model:leftLeft="control.LEFT"
        v-model:leftRight="control.RIGHT"
        v-model:leftDown="control.DOWN"
      />
    </div>
    <div class="grow min-w-0 overflow-hidden flex flex-col">
      <div
        v-if="status === 'error' || status === 'closed'"
        class="border-red-500 border-b text-red-400 bg-red-500/20 text-center py-2"
      >
        Cannot Connect to ROS...
      </div>
      <div
        class="shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out"
        :class="isMessageShown ? 'h-12' : 'h-0'"
      >
        <div
          class="border-b border-border h-12 transition-transform duration-300 ease-in-out"
          :class="isMessageShown ? 'translate-y-0' : '-translate-y-full'"
        >
          <Message/>
        </div>
      </div>
      <div
        class="grow h-0 flex"
        :class="{
          'flex-col': isPortrait,
        }"
      >
        <div
          v-for="(view, key) in views"
          :key="key"
          class="grow overflow-hidden"
          :class="{
            'hidden': !shownViews[key],
            'h-0': isPortrait,
            'w-0': !isPortrait,
          }">
          <component
            v-if="shownViews[key]"
            :is="view.component" />
        </div>
        <div
          v-if="isAllUINotShown"
          class="grow overflow-hidden grid place-content-center text-zinc-200 text-4xl"
          :class="isPortrait ? 'h-0' : 'w-0'"
        >
          <p>No UI is selected</p>
        </div>
      </div>
      <div class="border-t border-border basis-12 flex justify-center overflow-x-auto">
        <ViewTabButton
          @click="isMessageShown = !isMessageShown"
          :isActive="isMessageShown"
          icon="mdi:message-text"/>
        <ViewTabButton
          v-if="controllerStatus.available"
          @click="controllerStatus.shown = !controllerStatus.shown"
          :isActive="controllerStatus.shown"
          icon="bi:controller"/>
        <ViewTabButton
          v-for="({ icon }, key) in views"
          :key="key"
          @click="shownViews[key] = !shownViews[key]"
          :isActive="!!shownViews[key]"
          :icon="icon"/>
      </div>
    </div>
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="controllerStatus.shown ? 'w-40' : 'w-0'"
    >
      <ControllerRight
        class="transition-transform duration-300 ease-in-out"
        :class="controllerStatus.shown ? 'translate-x-0' : 'translate-x-full'"
        v-model:rightStick="control.rightStick"
        v-model:rightTrigger="control.RT"
        v-model:rightBumper="control.RB"
        v-model:rightUp="control.Y"
        v-model:rightLeft="control.X"
        v-model:rightRight="control.B"
        v-model:rightDown="control.A"
      />
    </div>
  </main>
</template>
<script setup lang="ts">
import ControllerLeft from '@/components/controller/controller_left.vue'
import ControllerRight from '@/components/controller/controller_right.vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ros, status } from '@/plugins/ros'
import Message from './components/message.vue'
import { createControllerTopicInterval } from './utils/createControllerTopicInterval'
import type { Control } from './model/control'
import ViewTabButton from './components/viewTabButton.vue'

import { views } from './views'

const controllerStatus = reactive({
  available: false,
  shown: false,
})
const isMessageShown = ref(true)
const shownViews = reactive<Partial<Record<keyof typeof views, boolean>>>({})

const isAllUINotShown = computed(() => {
  let tmp = true
  for(const key in shownViews){
    if( shownViews[key as keyof typeof shownViews] ){
      tmp = false
      break
    }
  }
  return tmp
})

const isPortrait = ref(false)

const updateIsPortrait = () => {
  isPortrait.value = window.innerHeight > window.innerWidth
}

onMounted(() => {
  updateIsPortrait()
  window.addEventListener('resize', updateIsPortrait)
  window.addEventListener('orientationchange', updateIsPortrait)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsPortrait)
  window.removeEventListener('orientationchange', updateIsPortrait)
})

watch(isPortrait, (changedToPortrait) => {
  if ( changedToPortrait && controllerStatus.shown ) {
    controllerStatus.shown = false
  }
  controllerStatus.available = !changedToPortrait
})

const control = reactive<Control>({
  LT: false,
  RT: false,
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
    y: 0,
  },
  rightStick: {
    x: 0,
    y: 0,
  },
})


let joyInterval: ReturnType<typeof setTimeout> | null = null
const joyTopicTPS = 30

watch(
  () => controllerStatus.shown,
  (shown) => {
    console.log('hi!')
    if (shown) {
      joyInterval = createControllerTopicInterval(ros, joyTopicTPS, control)
      console.log('startjoyinterval')
    } else {
      if (joyInterval) {
        clearInterval(joyInterval)
        joyInterval = null
      }
    }
  },
)
</script>
