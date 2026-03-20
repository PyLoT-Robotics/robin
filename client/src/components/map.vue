<template>
    <div
        ref="viewport"
        class="relative w-full h-full text-white overflow-hidden touch-none"
        @wheel.prevent="handleWheel"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @pointerleave="handlePointerUp"
        @dblclick="fitMapToViewport">
        <canvas
            ref="canvas"
            class="absolute left-0 top-0"
            :style="canvasTransformStyle"></canvas>
        <div class="absolute right-2 top-2 z-10 flex flex-col gap-1">
            <button
                type="button"
                class="h-9 w-9 rounded bg-zinc-900/70 border border-zinc-500 text-lg"
                @click="zoomIn">
                +
            </button>
            <button
                type="button"
                class="h-9 w-9 rounded bg-zinc-900/70 border border-zinc-500 text-lg"
                @click="zoomOut">
                -
            </button>
            <button
                type="button"
                class="h-9 w-9 rounded bg-zinc-900/70 border border-zinc-500 text-xs"
                @click="fitMapToViewport">
                Fit
            </button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { createTopic, type Ros, type Topic } from "@/api/ros";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const { ros } = defineProps<{ ros: Ros }>();
const mapTopic = "/map"

let subscriber: Topic | null = null;

function resolveTopicType(topicName: string) {
    return new Promise<string>((resolve) => {
        ros.getTopicType(topicName, (topicType) => {
            resolve(topicType && topicType.length > 0 ? topicType : "std_msgs/String");
        });
    });
}

const canvas = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();
let animationFrameId: number | null = null;
let pendingFrame: { width: number; height: number; data: ArrayLike<number> } | null = null;
const mapWidth = ref(0);
const mapHeight = ref(0);
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

const isDragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

const canvasTransformStyle = computed(() => ({
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
    imageRendering: "pixelated" as const,
    cursor: isDragging.value ? "grabbing" : "grab"
}));

function toSafeDimension(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : null;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function fitMapToViewport() {
    if (!viewport.value || mapWidth.value <= 0 || mapHeight.value <= 0) {
        return;
    }

    const viewportWidth = viewport.value.clientWidth;
    const viewportHeight = viewport.value.clientHeight;
    if (viewportWidth <= 0 || viewportHeight <= 0) {
        return;
    }

    const fitScale = clamp(
        Math.min(viewportWidth / mapWidth.value, viewportHeight / mapHeight.value),
        MIN_SCALE,
        MAX_SCALE
    );

    scale.value = fitScale;
    translateX.value = (viewportWidth - mapWidth.value * fitScale) / 2;
    translateY.value = (viewportHeight - mapHeight.value * fitScale) / 2;
}

function zoomAt(nextScale: number, centerX: number, centerY: number) {
    const safeScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const prevScale = scale.value;
    if (safeScale === prevScale) {
        return;
    }

    translateX.value = centerX - ((centerX - translateX.value) * safeScale) / prevScale;
    translateY.value = centerY - ((centerY - translateY.value) * safeScale) / prevScale;
    scale.value = safeScale;
}

function zoomIn() {
    if (!viewport.value) {
        return;
    }
    zoomAt(scale.value * 1.2, viewport.value.clientWidth / 2, viewport.value.clientHeight / 2);
}

function zoomOut() {
    if (!viewport.value) {
        return;
    }
    zoomAt(scale.value / 1.2, viewport.value.clientWidth / 2, viewport.value.clientHeight / 2);
}

function handleWheel(event: WheelEvent) {
    if (!viewport.value) {
        return;
    }

    const rect = viewport.value.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAt(scale.value * zoomFactor, centerX, centerY);
}

function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
        return;
    }
    isDragging.value = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = translateX.value;
    dragOriginY = translateY.value;
}

function handlePointerMove(event: PointerEvent) {
    if (!isDragging.value) {
        return;
    }
    translateX.value = dragOriginX + (event.clientX - dragStartX);
    translateY.value = dragOriginY + (event.clientY - dragStartY);
}

function handlePointerUp() {
    isDragging.value = false;
}

function drawMap(width: number, height: number, data: ArrayLike<number>) {
    if (!canvas.value || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return;
    }

    const ctx = canvas.value.getContext("2d");
    if (!ctx) {
        return;
    }

    const mapSizeChanged = canvas.value.width !== width || canvas.value.height !== height;
    canvas.value.width = width;
    canvas.value.height = height;
    mapWidth.value = width;
    mapHeight.value = height;

    const imageData = ctx.createImageData(width, height);
    const rgba = imageData.data;
    const pixelCount = width * height;
    const safeLength = Math.min(data.length, pixelCount);

    for (let i = 0; i < safeLength; i++) {
        const value = data[i];
        const color = value === 0 ? 255 : value === 100 ? 0 : 127;
        const offset = i * 4;
        rgba[offset] = color;
        rgba[offset + 1] = color;
        rgba[offset + 2] = color;
        rgba[offset + 3] = 255;
    }

    for (let i = safeLength; i < pixelCount; i++) {
        const offset = i * 4;
        rgba[offset] = 127;
        rgba[offset + 1] = 127;
        rgba[offset + 2] = 127;
        rgba[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    if (mapSizeChanged) {
        fitMapToViewport();
    }
}

function scheduleDraw(width: number, height: number, data: ArrayLike<number>) {
    pendingFrame = { width, height, data };
    if (animationFrameId !== null) {
        return;
    }

    animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        if (!pendingFrame) {
            return;
        }

        const frame = pendingFrame;
        pendingFrame = null;
        drawMap(frame.width, frame.height, frame.data);
    });
}

onMounted(async () => {
    window.addEventListener("resize", fitMapToViewport);

    try {
        const topicType = await resolveTopicType(mapTopic);
        subscriber = createTopic(ros, mapTopic, topicType);

        subscriber.subscribe((message) => {
            const msg = message as {
                width?: number
                height?: number
                info?: {
                    width?: number
                    height?: number
                }
                data?: ArrayLike<number>
            };

            const width = toSafeDimension(msg.width ?? msg.info?.width);
            const height = toSafeDimension(msg.height ?? msg.info?.height);
            if (!width || !height || !msg.data) {
                return;
            }

            scheduleDraw(width, height, msg.data);
        });
    } catch (error) {
        throw new Error(`Failed to subscribe: ${String(error)}`);
    }
})

onBeforeUnmount(() => {
    window.removeEventListener("resize", fitMapToViewport);

    if (!subscriber) {
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        pendingFrame = null;
        return;
    }
    subscriber.unsubscribe();
    subscriber = null;

    if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    pendingFrame = null;
});
</script>