import { getLocalStorageItem } from '@/hooks/useLocalStorage'
import * as RosLib from 'roslib'
import type { Action, Ros, Topic } from 'roslib'
import { ref } from 'vue'

export const defaultRosWebsocketURL = `wss://${window.location.host}/rosbridge`

export function createRos() {
  const storedWebSocketURL = getLocalStorageItem('WebSocketURL').trim()
  const rosWebsocketURL = storedWebSocketURL || defaultRosWebsocketURL
  const ros = new RosLib.Ros()

  const status = ref<'connected' | 'closed' | 'error'>('closed')
  const error = ref<string | null>(null)
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelayMs = 1000

  const scheduleReconnect = () => {
    if (reconnectTimer) {
      return
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      try {
        ros.connect(rosWebsocketURL)
      } catch (err) {
        error.value = err instanceof Error ? err.message : String(err)
        scheduleReconnect()
      }
    }, reconnectDelayMs)

    reconnectDelayMs = Math.min(reconnectDelayMs * 2, 15000)
  }

  ros.on('connection', () => {
    status.value = 'connected'
    error.value = null
    reconnectDelayMs = 1000
    console.log('🙌 Connected to WebSocket')
  })

  ros.on('close', () => {
    status.value = 'closed'
    console.log('👋 WebSocket Closed!')
    scheduleReconnect()
  })

  ros.on('error', (err) => {
    status.value = 'error'
    error.value = err instanceof Error ? err.message : String(err)
    console.error('⚠ Error occurred in WebSocket Connection')
    console.log(err)
    scheduleReconnect()
  })

  ros.connect(rosWebsocketURL)

  return { ros, status, error }
}

export function createTopic(ros: RosLib.Ros, name: string, messageType: string) {
  return new RosLib.Topic({
    ros,
    name,
    messageType,
  })
}

export function createService(
  ros: RosLib.Ros,
  name: string,
  serviceType: 'rosapi/Topics' | 'rosapi/TopicType',
) {
  return new RosLib.Service({
    ros,
    name,
    serviceType,
  })
}

export function createAction(ros: RosLib.Ros, name: string, actionType: string) {
  return new RosLib.Action({
    ros,
    name,
    actionType,
  })
}

export type { Action, Ros, Topic }
