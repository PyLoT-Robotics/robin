<template>
    <div class="w-full h-full bg-zinc-950 border-l border-zinc-800/80 flex flex-col min-h-0">
        <div class="shrink-0 px-3 py-2 border-b border-zinc-800/80 font-mono text-xs text-zinc-400">
            <p>topic: {{ activeTopic }}</p>
            <p v-if="subscribeError" class="text-red-400">{{ subscribeError }}</p>
        </div>

        <div
            ref="logContainer"
            class="grow min-h-0 overflow-y-auto px-3 py-2 font-mono text-xs leading-5 text-zinc-200">
            <p v-if="entries.length === 0" class="text-zinc-500">
                Waiting for messages...
            </p>
            <p
                v-for="entry in entries"
                :key="entry.id"
                class="whitespace-pre-wrap break-all">
                {{ entry.line }}
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { createService, createTopic, type Ros } from "@/api/ros";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Topic } from "roslib";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const { ros } = defineProps<{ ros: Ros }>();

const MAX_LINES = 50;

const entries = ref<{ id: number; line: string }[]>([]);
const subscribeError = ref<string | null>(null);
const logContainer = ref<HTMLElement | null>(null);

let sequence = 0;
let subscriber: Topic | null = null;

const activeTopic = useLocalStorage("LogTopic");
const topicTypeService = createService(ros, "/rosapi/topic_type", "rosapi/TopicType");

function pushLine(line: string) {
    sequence += 1;
    entries.value.push({
        id: sequence,
        line,
    });

    if (entries.value.length > MAX_LINES) {
        entries.value.splice(0, entries.value.length - MAX_LINES);
    }

    nextTick(() => {
        if (!logContainer.value) {
            return;
        }
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
    });
}

function stopSubscribe() {
    if (!subscriber) {
        return;
    }
    subscriber.unsubscribe();
    subscriber = null;
}

function resolveTopicType(topicName: string) {
    return new Promise<string>((resolve) => {
        topicTypeService.callService({ topic: topicName }, (result) => {
            const topicType = (result as { type?: string }).type;
            resolve(topicType && topicType.length > 0 ? topicType : "std_msgs/String");
        });
    });
}

async function startSubscribe(topicName: string) {
    stopSubscribe();
    subscribeError.value = null;

    try {
        const topicType = await resolveTopicType(topicName);
        subscriber = createTopic(ros, topicName, topicType);

        subscriber.subscribe((message) => {
            const timestamp = new Date().toLocaleTimeString();
            pushLine(`[${timestamp}] ${topicName} ${JSON.stringify(message)}`);
        });
    } catch (error) {
        subscribeError.value = `Failed to subscribe: ${String(error)}`;
    }
}

watch(
    activeTopic,
    (newTopic) => {
        startSubscribe(newTopic);
    },
    { immediate: true }
);

onBeforeUnmount(() => {
    stopSubscribe();
});
</script>