import { createService, type Ros } from "@/api/ros";
import { computed, ref } from "vue";

export function useTopicsList(ros: Ros) {
  const topicsService = createService(ros, "/rosapi/topics", "rosapi/Topics");

  const _topicsList = ref<string[]>([]);
  const topicsList = computed<Readonly<string[]>>(() => _topicsList.value);

  function updateTopicsList() {
    return new Promise<void>((resolve) => {
        topicsService.callService({}, (result) => {
            _topicsList.value = (result as { topics: string[] }).topics;
            resolve()
        });
    })
  }

  updateTopicsList();

  return { topicsList, updateTopicsList };
}
