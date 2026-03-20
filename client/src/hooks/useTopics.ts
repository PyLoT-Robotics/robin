import { createService, type Ros } from "@/api/ros";
import { computed, ref } from "vue";

export function useTopics(ros: Ros) {
  const topicsService = createService(ros, "/rosapi/topics", "rosapi/Topics");

  const _topics = ref<string[]>([]);
  const topics = computed<Readonly<string[]>>(() => _topics.value);

  function updateTopics() {
    return new Promise<void>((resolve) => {
        topicsService.callService({}, (result) => {
            _topics.value = result.topics as string[];
            resolve()
        });
    })
  }

  updateTopics();

  return { topics, updateTopics };
}
