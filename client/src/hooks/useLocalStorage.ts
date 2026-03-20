import { computed } from "vue";

type LocalStorageKeys =
  | "WebSocketURL"

export function getLocalStorage(key: LocalStorageKeys){
  return localStorage.getItem(key)
}

export function useLocalStorage(key: LocalStorageKeys){
  return computed({
    get: () => {
      return localStorage.getItem(key)
    },
    set: (value: string) => {
      localStorage.setItem(key, value)
    }
  })
}