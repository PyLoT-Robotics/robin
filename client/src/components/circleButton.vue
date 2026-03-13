<template>
  <div>
    <button
      @touchstart="isButtonPressed = true"
      @touchcancel="isButtonPressed = false"
      @touchend="isButtonPressed = false"
      class="relative size-8">
      <div
        :class="{
          'bg-white text-black': isButtonPressed,
          'bg-black text-white': !isButtonPressed
        }"
        class="absolute -top-1 h-full w-full rounded-full border border-white grid place-content-center">
        <Icon
          v-if="icon"
          :icon
          class="text-sm"/>
        <span
          v-else
          class="font-mono text-sm">{{ name }}</span>
      </div>
      <div class="h-full w-full rounded-full border border-white border-dotted"/>
    </button>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed } from 'vue';
          
const { name } = defineProps<{
  name: string
}>()

const isButtonPressed = defineModel<boolean>("clicked", { required: false })

const icon = computed(() => {
  return ({
    '↑': 'fa6-solid:chevron-up',
    '←': 'fa6-solid:chevron-left',
    '↓': 'fa6-solid:chevron-down',
    '→': 'fa6-solid:chevron-right',
    '⚙️': 'fa6-solid:gear',
  })[name]
})
</script>