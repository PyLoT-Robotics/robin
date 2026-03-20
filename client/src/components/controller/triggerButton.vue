<template>
  <div>
    <button
      @touchstart="isButtonPressed = true"
      @touchcancel="isButtonPressed = false"
      @touchend="isButtonPressed = false"
      class="relative w-full h-8">
      <div
        :class="{
          'bg-white text-black': isButtonPressed,
          'bg-black text-white': !isButtonPressed
        }"
        class="absolute -top-1 h-full w-full rounded-lg border border-white grid place-content-center">
        <span class="font-mono text-sm">{{ name }}</span>
      </div>
      <div class="h-full w-full rounded-lg border border-white border-dotted"/>
    </button>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  name: string
}>()

const isButtonPressed = defineModel<boolean>("clicked", { required: false })
</script>