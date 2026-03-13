<template>
  <CircleButton
    name="⚙️"
    @click="isOpen = true"/>
  <Modal
    v-model:open="isOpen"
    title="Settings">
    <div class="grow grid grid-cols-[max-content,1fr] gap-4 overflow-y-auto place-content-center p-4 font-mono text-lg">
      <p class="text-right">WebSocketURL:</p>
      <input
        type="url"
        placeholder="ws://localhost:9090"
        class="border px-3 bg-transparent border-white border-dotted placeholder:text-white/40 outline-none"
        v-model="webSocketURL"/>
      </div>
    <div class="flex flex-row justify-center gap-4">
      <TriggerButton
        @click="close"
        name="CLOSE"
        class="w-32"/>
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import CircleButton from './circleButton.vue';
import TriggerButton from './triggerButton.vue';
import Modal from './modal.vue';
import { useLocalStorage } from '../utils/useLocalStorage';
import { useTmp } from '../utils/useTmp';

const isOpen = ref(false)
const [ webSocketURL, save ] = useTmp(useLocalStorage('WebSocketURL'))

function close(){
  const changed = save()
  isOpen.value = false
  if( changed ){
    location.reload()
  }
}
</script>