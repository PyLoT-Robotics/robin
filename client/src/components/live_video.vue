<template>
  <div class="flex flex-col overflow-hidden w-full h-full">
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      muted
      preload="none"
      class="grow object-contain" />
    <div
      class="rounded-md px-3 py-1 text-sm font-mono text-center border-b border-border"
      :class="isFrameStale ? 'text-red-400' : 'text-zinc-100'"
      v-if="lastFrameUpdatedAtText">
      Last frame updated: {{ lastFrameAgeText }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";

const remoteVideo = ref<HTMLVideoElement | null>(null)

const incomingStream = ref<MediaStream | null>(null)
const lastFrameUpdatedAt = ref<Date | null>(null)
const nowMs = ref(Date.now())
const peerConnection = ref<RTCPeerConnection | null>(null)

let nowTimer: ReturnType<typeof setInterval> | null = null
let inboundStatsTimer: ReturnType<typeof setInterval> | null = null
let lastDecodedFrames = -1
let statsPolling = false

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

watchEffect(() => {
  if (!remoteVideo.value || !incomingStream.value) {
    return
  }

  remoteVideo.value.srcObject = incomingStream.value
})

async function pollInboundFrameStats() {
  const pc = peerConnection.value
  if (!pc || statsPolling) {
    return
  }

  statsPolling = true
  try {
    const receivers = pc.getReceivers().filter((receiver) => receiver.track?.kind === "video")
    let maxFramesDecoded = lastDecodedFrames

    for (const receiver of receivers) {
      const stats = await receiver.getStats()
      stats.forEach((report) => {
        if (report.type !== "inbound-rtp" || report.kind !== "video") {
          return
        }

        const framesDecoded = Number(report.framesDecoded ?? 0)
        if (framesDecoded > maxFramesDecoded) {
          maxFramesDecoded = framesDecoded
        }
      })
    }

    if (maxFramesDecoded > lastDecodedFrames) {
      lastDecodedFrames = maxFramesDecoded
      lastFrameUpdatedAt.value = new Date()
    }
  } finally {
    statsPolling = false
  }
}

onMounted(() => {
  const pc = new RTCPeerConnection();
  peerConnection.value = pc

  nowTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 100)

  inboundStatsTimer = setInterval(() => {
    void pollInboundFrameStats()
  }, 200)

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

  if (inboundStatsTimer) {
    clearInterval(inboundStatsTimer)
    inboundStatsTimer = null
  }

  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
  }
})
</script>