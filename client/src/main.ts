import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { normalizeConnectionHost } from './api/ros'

const params = new URLSearchParams(window.location.search)
const webSocketUrlParam = params.get('websocket_url')

if (webSocketUrlParam) {
  const connectionHost = normalizeConnectionHost(webSocketUrlParam)
  if (connectionHost) {
    localStorage.setItem('WebSocketURL', connectionHost)
  }
}

createApp(App).mount('#app')
