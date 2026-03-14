<template>
  <main class="flex flex-row bg-zinc-950 w-screen h-screen">
    <div class="basis-1/4 shrink-0 border-r border-border"></div>
    <div class="grow min-w-0 overflow-hidden flex flex-col">
      <div class="border-b border-border basis-16">
        <div class="w-full h-full min-w-0 flex items-center justify-start text-xl font-mono text-zinc-200">
          <p class="block min-w-0 w-full max-w-full truncate px-4">
            Message...
          </p>
        </div>
      </div>
      <div class="grow">
        <LiveVideo />
      </div>
      <div class="border-t border-border basis-16 flex">
        <button
          v-for="(button, key) in shownUI"
          :key
          class="aspect-square border-r border-border grid place-content-center"
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
          class="aspect-square border-r border-border grid place-content-center">
          <Icon
            icon='bi:gear-wide-connected'
            class="text-zinc-400 text-3xl"/>
        </button>
      </div>
    </div>
    <div class="basis-1/4 shrink-0 border-l border-border"></div>
  </main>
</template>
<script setup lang="ts">
import LiveVideo from '@/components/live_video.vue';
import { Icon } from '@iconify/vue';
import { reactive } from 'vue';

const shownUI = reactive<{
  [key: string]: {
    readonly icon: string
    shown: boolean
  }
}>({
  controller: { icon: 'bi:controller', shown: false },
  chat: { icon: 'bi:chat-left-dots', shown: false },
  console: { icon: 'bi:terminal', shown: false },
  robotStatus: { icon: 'streamline-ultimate:factory-industrial-robot-arm-1-bold', shown: false }
})
</script>