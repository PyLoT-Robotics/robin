<template>
  <main class="flex flex-row bg-zinc-950 w-screen h-screen">
    <div class="basis-1/4 shrink-0 border-r border-zinc-700"></div>
    <div class="grow min-w-0 overflow-hidden flex flex-col">
      <div class="border-b border-zinc-700 basis-16">
        <div class="w-full h-full min-w-0 flex items-center justify-start text-xl font-mono text-zinc-200">
          <p class="block min-w-0 w-full max-w-full truncate px-4">
            Message...
          </p>
        </div>
      </div>
      <div class="grow">
        <LiveVideo />
      </div>
      <div class="border-t border-zinc-700 basis-16"></div>
    </div>
    <div class="basis-1/4 shrink-0 border-l border-zinc-700"></div>
  </main>
</template>
<script setup lang="ts">
import LiveVideo from '@/components/live_video.vue';
</script>