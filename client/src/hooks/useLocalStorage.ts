import { ref, computed } from 'vue'

type LocalStorageKeys = 'CameraTopic' | 'LogTopic'

// グローバルな状態を管理
const storageState = ref<Record<LocalStorageKeys, string>>({
  CameraTopic: localStorage.getItem('CameraTopic') || '',
  LogTopic: localStorage.getItem('LogTopic') || '',
})

export function useLocalStorage(key: LocalStorageKeys) {
  return computed({
    get: () => storageState.value[key],
    set: (value: string) => {
      storageState.value[key] = value
      localStorage.setItem(key, value)
      // 他のタブ/ウィンドウとの同期
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }))
    },
  })
}
