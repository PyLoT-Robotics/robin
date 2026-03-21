import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const params = new URLSearchParams(window.location.search)
const webSocketUrlParam = params.get('websocket_url')

if (webSocketUrlParam) {
  localStorage.setItem('WebSocketURL', webSocketUrlParam)
}

createApp(App).mount('#app')
