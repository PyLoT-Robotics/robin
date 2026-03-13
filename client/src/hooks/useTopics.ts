import type { Ros } from "roslib";
import * as RosLib from "roslib";
import { computed, ref } from "vue";

export function useTopics(ros: Ros) {
  const topicsService = new RosLib.Service({
    ros,
    name: "/rosapi/topics",
    serviceType: "rosapi/Topics",
  });

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
