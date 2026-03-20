import type { Control } from "../model/control";
import { createTopic, type Ros } from "@/api/ros";

function getDpadValue(a: boolean, b: boolean): number {
  return a ? (b ? 0 : 1) : (b ? -1 : 0);
}

function convertControlToJoyMessage(controls: Control): unknown {
  const dpadX = getDpadValue(controls.RIGHT, controls.LEFT);
  const dpadY = getDpadValue(controls.DOWN, controls.UP);
  return {
    axes: [
      controls.leftStick.x,
      controls.leftStick.y,
      controls.rightStick.y,
      controls.rightStick.x,
      0,
      0,
      1,
      dpadX,
      dpadY,
    ],
    buttons: [
      controls.A ? 1 : 0,
      controls.B ? 1 : 0,
      controls.X ? 1 : 0,
      controls.Y ? 1 : 0,
      controls.LB ? 1 : 0,
      controls.RB ? 1 : 0,
      0,
      0,
      0,
      0,
      0
    ],
  };
}

export async function createControllerTopicInterval(ros: Ros, TPS: number, controls: Control){
  const name = "/joy"
  const messageType = await new Promise<string>(resolve => ros.getTopicType(name, resolve))
  const joyTopic = createTopic( ros, name, messageType )

  return setInterval(() => {
    joyTopic.publish(convertControlToJoyMessage(controls));
  }, 1000 / TPS);
}