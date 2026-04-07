<template>
  <button
    class="px-4 border-x border-border grid place-content-center"
    :class="{
      'bg-zinc-600 text-zinc-900': isActive,
      'text-zinc-400': !isActive
    }"
  >
    <Icon :icon="icon" class="text-2xl" />
  </button>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue'

const {
  isActive,
  icon
} = defineProps<{
  isActive: boolean
  icon: string
}>()
</script>
