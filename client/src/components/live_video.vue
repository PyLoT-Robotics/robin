<template>
  <div class="overflow-hidden flex items-center justify-center w-full h-full">
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      muted
      preload="none"
      class="w-full h-full object-contain" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watchEffect } from "vue";

const remoteVideo = ref<HTMLVideoElement | null>(null)

const incomingStream = ref<MediaStream | null>(null)

watchEffect(() => {
  if (remoteVideo.value && incomingStream.value) {
    console.log("ready!?")
    remoteVideo.value.srcObject = incomingStream.value;
  }
});

onMounted(() => {
  const pc = new RTCPeerConnection();

  pc.addTransceiver("video", { direction: "recvonly" });

  pc.ontrack = (event) => {
    incomingStream.value = event.streams[0];
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
</script>