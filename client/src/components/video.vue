<template>
  <main class="bg-black overflow-hidden flex items-center justify-center w-full rounded-md border border-white">
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      muted
      preload="none"
      class="w-full h-full object-contain" />
  </main>
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
  
    const response = await fetch(`http://${window.location.hostname}:8080/offer`, {
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