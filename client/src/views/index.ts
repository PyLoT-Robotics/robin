import type { Component } from "vue"
import ArmController from "./armController.vue"
import LiveVideo from "./live_video.vue"
import Log from "./log.vue"
import Map from "./map.vue"
import settings from "./settings.vue"

type ViewDefinition = {
  icon: string
  component: Component
}

export const views = {
  live_video: {
    icon: 'fa6-solid:video',
    component: LiveVideo,
  },
  log: {
    icon: 'bi:terminal',
    component: Log,
  },
  map: {
    icon: 'bi:map',
    component: Map,
  },
  armController: {
    icon: 'streamline-ultimate:factory-industrial-robot-arm-1-bold',
    component: ArmController,
  },
  settings: {
    icon: 'bi:gear',
    component: settings,
  },
} as const satisfies Record<string, ViewDefinition>
