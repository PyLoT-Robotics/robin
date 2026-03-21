<template>
  <div class="relative overflow-hidden flex items-center justify-center w-full h-full">
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      muted
      preload="none"
      class="w-full h-full object-contain" />
    <div
      class="absolute bottom-3 right-3 rounded-md bg-black/65 px-3 py-1 text-sm font-mono"
      :class="isFrameStale ? 'text-red-300' : 'text-zinc-100'"
      v-if="lastFrameUpdatedAtText">
      Last frame: {{ lastFrameUpdatedAtText }} ({{ lastFrameAgeText }})
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";

const remoteVideo = ref<HTMLVideoElement | null>(null)

const incomingStream = ref<MediaStream | null>(null)
const lastFrameUpdatedAt = ref<Date | null>(null)
const nowMs = ref(Date.now())

let nowTimer: ReturnType<typeof setInterval> | null = null

function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(1)}s ago`
}

const timestampFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

const lastFrameUpdatedAtText = computed(() => {
  if (!lastFrameUpdatedAt.value) {
    return ""
  }
  const milliseconds = String(lastFrameUpdatedAt.value.getMilliseconds()).padStart(3, "0")
  return `${timestampFormatter.format(lastFrameUpdatedAt.value)}.${milliseconds}`
})

const lastFrameAgeText = computed(() => {
  return formatDuration(frameAgeMs.value)
})

const frameAgeMs = computed(() => {
  if (!lastFrameUpdatedAt.value) {
    return 0
  }
  return Math.max(0, nowMs.value - lastFrameUpdatedAt.value.getTime())
})

const isFrameStale = computed(() => frameAgeMs.value >= 2000)

watchEffect((onCleanup) => {
  if (!remoteVideo.value || !incomingStream.value) {
    return
  }

  remoteVideo.value.srcObject = incomingStream.value

  const videoElement = remoteVideo.value
  if (!("requestVideoFrameCallback" in videoElement)) {
    return
  }

  let isActive = true
  const updateTimestamp = () => {
    if (!isActive) {
      return
    }
    lastFrameUpdatedAt.value = new Date()
    videoElement.requestVideoFrameCallback(updateTimestamp)
  }

  videoElement.requestVideoFrameCallback(updateTimestamp)
  onCleanup(() => {
    isActive = false
  })
});

onMounted(() => {
  const pc = new RTCPeerConnection();

  nowTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 100)

  pc.addTransceiver("video", { direction: "recvonly" });

  pc.ontrack = (event) => {
    incomingStream.value = event.streams[0] ?? null;
  };

  async function negotiate() {
    const offer = await pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: false
    });
    await pc.setLocalDescription(offer);
  
    if( !pc.localDescription ) throw new Error("Local description is null");
  
    const response = await fetch(`https://${window.location.hostname}:${window.location.port}/video_publisher/offer`, {
      method: "POST",
      body: JSON.stringify({
        sdp: pc.localDescription.sdp,
        type: pc.localDescription.type,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  
    if (!response.ok) {
      throw new Error('シグナリングサーバーからのレスポンスが不正です');
    }
  
    const answer = await response.json();
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
  
  negotiate();
})

onUnmounted(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
})
</script>