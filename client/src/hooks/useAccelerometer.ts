import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

export function useAccelerometer(){
    const acceleration = reactive({ x: 0, y: 0, z: 0 })
    const permissionState = ref<'unknown' | 'required' | 'granted' | 'denied' | 'unsupported'>(
      'unknown',
    )
    let isListening = false
    
    const statusText = computed(() => {
      switch (permissionState.value) {
        case 'unsupported':
          return 'This browser/device does not support DeviceMotionEvent.'
        case 'required':
          return 'Permission required. Tap the button to enable motion sensor.'
        case 'denied':
          return 'Permission denied. Please allow Motion & Orientation access in browser settings.'
        case 'granted':
          return 'Receiving sensor values from your device.'
        default:
          return 'Checking sensor availability...'
      }
    })
    
    function handleMotion(event: DeviceMotionEvent): void {
      const accel = event.acceleration ?? event.accelerationIncludingGravity
      acceleration.x = accel?.x ?? 0
      acceleration.y = accel?.y ?? 0
      acceleration.z = accel?.z ?? 0
    }
    
    function startListening(): void {
      if (isListening || typeof window === 'undefined') return
      window.addEventListener('devicemotion', handleMotion)
      isListening = true
    }
    
    async function requestPermissionAndStart(): Promise<void> {
      if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
        permissionState.value = 'unsupported'
        return
      }
    
      const deviceMotionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
    
      if (!deviceMotionCtor.requestPermission) {
        permissionState.value = 'granted'
        startListening()
        return
      }
    
      try {
        const result = await deviceMotionCtor.requestPermission()
        if (result === 'granted') {
          permissionState.value = 'granted'
          startListening()
          return
        }
        permissionState.value = 'denied'
      } catch {
        permissionState.value = 'denied'
      }
    }
    
    onMounted(() => {
      if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
        permissionState.value = 'unsupported'
        return
      }
    
      const deviceMotionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
    
      if (deviceMotionCtor.requestPermission) {
        permissionState.value = 'required'
        return
      }
    
      permissionState.value = 'granted'
      startListening()
    })
    
    onBeforeUnmount(() => {
      if (typeof window === 'undefined' || !isListening) return
      window.removeEventListener('devicemotion', handleMotion)
      isListening = false
    })

    return {
        acceleration,
        statusText,
        permissionState,
        requestPermissionAndStart
    }
}

export function formatAxis(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}