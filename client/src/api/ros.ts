import * as RosLib from "roslib";
import { getLocalStorage } from "../utils/useLocalStorage";

export function createRos() {
  const RosWebsocketUrl = getLocalStorage("WebSocketURL") ?? "";
  
  const ros = new RosLib.Ros({
    url: RosWebsocketUrl
  });

  ros.on("connection", () => {
    console.log("🙌 Connected to WebSocket");
  });

  ros.on("error", (error) => {
    console.log("⚠ Error occurred in WebSocket Connection: ", error);
  });

  ros.on("close", () => {
    console.log("👋 WebSocket Closed!");
  });

  setInterval(() => { console.log(ros.isConnected) }, 1000)

  return { ros }
}
