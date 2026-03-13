import { ref, type Ref } from "vue";

export function useTmp<T>(value: Ref<T>){
  const tmp = ref<T>(value.value)
  function save(){
    const changed = value.value !== tmp.value
    value.value = tmp.value
    return changed
  }
  return [
    tmp,
    save
  ] as const
}