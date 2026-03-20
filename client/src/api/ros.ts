import * as RosLib from "roslib";
import type { Ros } from "roslib";
import { ref } from "vue";

export function createRos() {
  const RosWebsocketUrl = `wss://${window.location.hostname}:${window.location.port}/ws`;
  
  const ros = new RosLib.Ros({
    url: RosWebsocketUrl
  });

  ros.connect(RosWebsocketUrl);

  ros.on("error", (error) => {
    console.error("⚠ Error occurred in WebSocket Connection");
    console.log(error)
  });

  setInterval(() => { console.log(ros.isConnected) }, 1000)

  const status = ref<"connected" | "closed" | "error">("closed");
  const error = ref<string | null>(null);

  ros.on("connection", () => {
    status.value = "connected";
    error.value = null;
    console.log("🙌 Connected to WebSocket");
  });

  ros.on("close", () => {
    status.value = "closed";
    console.log("👋 WebSocket Closed!");
  });

  ros.on("error", (err) => {
    status.value = "error";
    error.value = err instanceof Error ? err.message : String(err);
    console.error("⚠ Error occurred in WebSocket Connection");
    console.log(err);
  });

  return { ros, status, error };
}

export function createTopic( ros: RosLib.Ros, name: string, messageType: string ){
  return new RosLib.Topic({
    ros,
    name,
    messageType
  });
}

export function createService(
  ros: RosLib.Ros,
  name: string,
  serviceType: "rosapi/Topics" | "rosapi/TopicType"
){
  return new RosLib.Service({
    ros,
    name,
    serviceType
  });
}

export type { Ros };