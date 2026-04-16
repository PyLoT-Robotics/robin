import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Tracks the browser's online/offline state via the `online` and `offline`
 * window events.
 *
 * Note: `navigator.onLine` (and therefore this composable) reflects whether
 * the device has a network interface connection, not whether there is actual
 * internet connectivity.
 */
export function useOnlineStatus() {
  const isOnline = ref(navigator.onLine)

  const handleOnline = () => {
    isOnline.value = true
  }
  const handleOffline = () => {
    isOnline.value = false
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { isOnline }
}
