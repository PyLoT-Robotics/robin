<template>
  <Dialog
    :open="isOpen"
    @close="isOpen = false"
    as="div"
    class="px-16 py-4 fixed z-50 top-0 left-0 w-full h-full">
    <div
      @click="isOpen = false"
      class="fixed top-0 left-0 w-full h-full bg-stripe bg-cover -z-10"/>
    <h1 class="font-mono font-semibold fixed top-0 left-1/2 -translate-x-1/2 text-xs text-white bg-black px-2">{{ title }}</h1>
    <DialogPanel
      class="text-white bg-black w-full h-full flex flex-col gap-2 border border-white rounded-2xl p-4">
      <slot/>
    </DialogPanel>
  </Dialog>
</template>
<script setup lang="ts">
const isOpen = defineModel<boolean>("open", { required: true })

defineProps<{
  title: string
}>()
</script>