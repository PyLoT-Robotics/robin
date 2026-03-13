<template>
  <div class="pt-3">
    <div class="relative size-20">
      <div
        ref="stickElement"
        @mousedown="(e) => mouseHandler(onControlStart)(e)"
        @mouseup="onControlEnd"
        @mousemove="(e) => mouseHandler(onControl)(e)"
        @touchstart.prevent="(e) => touchHandler(onControlStart)(e)"
        @touchend="onControlEnd"
        @touchmove="(e) => touchHandler(onControl)(e)"
        @dragstart.prevent
        class="absolute -top-3 h-full w-full rounded-full border border-white bg-black p-1.5">
        <div class="h-full w-full rounded-full border border-white border-dotted -translate-y-0.5"/>
      </div>
      <div class="h-full w-full p-2">
        <div class="h-full w-full rounded-full border border-white border-dotted">

        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

const _position = defineModel<{
  x: number,
  y: number
}>("position", { required: true })

const THRESHOLD = 50 //px

function updatePosition(x: number, y: number){
  const distance = Math.sqrt(x * x + y * y);
  if (distance > THRESHOLD) {
    _position.value.x = x / distance;
    _position.value.y = -y / distance;
  } else {
    _position.value.x = x / THRESHOLD;
    _position.value.y = -y / THRESHOLD;
  }
}

const originalPosition = {
  top: 0,
  left: 0
};

onMounted(() => {
  if( !stickElement.value ) throw new Error("stick element not found");
  originalPosition.top = stickElement.value.offsetTop
  originalPosition.left = stickElement.value.offsetLeft
})

const stickElement = ref<HTMLDivElement>();

function onControlStart(clientX: number, clientY: number){
  isDragging = true;
  if( !stickElement.value ) throw new Error("stick element not found");
  const dragElement = stickElement.value;
  const rect = dragElement.getBoundingClientRect();
  offsetX = clientX - rect.left;
  offsetY = clientY - rect.top;
  dragElement.style.transition = 'none';
}

function onControl(clientX: number, clientY: number){
  if (!isDragging) return;
  
  if( !stickElement.value ) throw new Error("stick element not found");
  const dragElement = stickElement.value;
  if( !dragElement.parentElement ) throw new Error("stick element parent not found");
  const containerRect = dragElement.parentElement.getBoundingClientRect();

  updatePosition(
    clientX - containerRect.left - offsetX,
    clientY - containerRect.top - offsetY
  )
  
  dragElement.style.left = _position.value.x * THRESHOLD + 'px';
  dragElement.style.top = -_position.value.y * THRESHOLD + 'px';
}

function onControlEnd(){
  if (!isDragging) return;
  isDragging = false;
  
  if( !stickElement.value ) throw new Error("stick element not found");
  const dragElement = stickElement.value;
  dragElement.style.transition = 'left 0.3s ease, top 0.3s ease';
  dragElement.style.left = originalPosition.left + 'px';
  dragElement.style.top = originalPosition.top + 'px';
  updatePosition(0, 0);
}

function mouseHandler(handler: (clientX: number, clientY: number) => void){
  return (e: MouseEvent) => {
    handler(e.clientX, e.clientY);
  }
}

function getTouchDistance( touch: Touch ){
  if( !stickElement.value ) throw new Error("stick element not found");
  const dragElement = stickElement.value;
  if( !dragElement.parentElement ) throw new Error("stick element parent not found");
  const containerRect = dragElement.parentElement.getBoundingClientRect();
  return Math.hypot(
    touch.clientX - containerRect.left - offsetX,
    touch.clientY - containerRect.top - offsetY
  )
}

function touchHandler(handler: (clientX: number, clientY: number) => void){
  return (e: TouchEvent) => {
    const touch = Array.from(e.touches).sort((a, b) => getTouchDistance(a) - getTouchDistance(b))[0];
    handler(touch.clientX, touch.clientY);
  }
}
</script>