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
        <canvas
            ref="costmapCanvas"
            class="absolute left-0 top-0 pointer-events-none"
            :style="canvasTransformStyle"></canvas>
        <canvas
            ref="scanCanvas"
            class="absolute left-0 top-0 pointer-events-none"
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
            <button
                type="button"
                class="h-9 w-9 rounded border text-[10px]"
                :class="showScan ? 'bg-emerald-500/80 border-emerald-300 text-emerald-50' : 'bg-zinc-900/70 border-zinc-500 text-zinc-200'"
                @click="toggleScanOverlay">
                Scan
            </button>
            <button
                type="button"
                class="h-9 w-9 rounded border text-[10px]"
                :class="showGlobalCostmap ? 'bg-amber-500/80 border-amber-300 text-amber-50' : 'bg-zinc-900/70 border-zinc-500 text-zinc-200'"
                @click="toggleGlobalCostmapOverlay">
                GCost
            </button>
            <button
                type="button"
                class="h-9 w-9 rounded border text-[10px]"
                :class="showLocalCostmap ? 'bg-cyan-500/80 border-cyan-300 text-cyan-50' : 'bg-zinc-900/70 border-zinc-500 text-zinc-200'"
                @click="toggleLocalCostmapOverlay">
                LCost
            </button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { createTopic, type Ros, type Topic } from "@/api/ros";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const { ros } = defineProps<{ ros: Ros }>();
const mapTopic = "/map"
const scanTopic = "/scan"
const tfTopic = "/tf"
const tfStaticTopic = "/tf_static"
const globalCostmapTopics = [
    "/move_base/global_costmap/costmap",
    "/global_costmap/costmap"
];
const localCostmapTopics = [
    "/move_base/local_costmap/costmap",
    "/local_costmap/costmap"
];

let mapSubscriber: Topic | null = null;
let scanSubscriber: Topic | null = null;
let tfSubscriber: Topic | null = null;
let tfStaticSubscriber: Topic | null = null;
let globalCostmapSubscriber: Topic | null = null;
let localCostmapSubscriber: Topic | null = null;

type Pose2D = {
    x: number
    y: number
    yaw: number
};

type TfTransformMessage = {
    header?: {
        frame_id?: string
    }
    child_frame_id?: string
    transform?: {
        translation?: {
            x?: number
            y?: number
        }
        rotation?: {
            x?: number
            y?: number
            z?: number
            w?: number
        }
    }
};

type TfMessage = {
    transforms?: TfTransformMessage[]
};

type OccupancyGridMessage = {
    header?: {
        frame_id?: string
    }
    info?: {
        width?: number
        height?: number
        resolution?: number
        origin?: {
            position?: {
                x?: number
                y?: number
            }
            orientation?: {
                x?: number
                y?: number
                z?: number
                w?: number
            }
        }
    }
    data?: ArrayLike<number>
};

type CostmapData = {
    frameId: string
    width: number
    height: number
    resolution: number
    originX: number
    originY: number
    originYaw: number
    data: ArrayLike<number>
};

function resolveTopicType(topicName: string) {
    return new Promise<string>((resolve) => {
        ros.getTopicType(topicName, (topicType) => {
            resolve(topicType && topicType.length > 0 ? topicType : "std_msgs/String");
        });
    });
}

function resolveExistingTopicType(topicName: string) {
    return new Promise<string | null>((resolve) => {
        ros.getTopicType(topicName, (topicType) => {
            if (topicType && topicType.length > 0) {
                resolve(topicType);
                return;
            }
            resolve(null);
        });
    });
}

const canvas = ref<HTMLCanvasElement>();
const costmapCanvas = ref<HTMLCanvasElement>();
const scanCanvas = ref<HTMLCanvasElement>();
const viewport = ref<HTMLDivElement>();
let animationFrameId: number | null = null;
let scanAnimationFrameId: number | null = null;
let costmapAnimationFrameId: number | null = null;
let pendingFrame: { width: number; height: number; data: ArrayLike<number> } | null = null;
let latestScan: {
    angleMin: number;
    angleIncrement: number;
    rangeMin: number;
    rangeMax: number;
    frameId: string;
    ranges: ArrayLike<number>;
} | null = null;
let latestGlobalCostmap: CostmapData | null = null;
let latestLocalCostmap: CostmapData | null = null;
const tfTransforms = new Map<string, Pose2D>();
const mapWidth = ref(0);
const mapHeight = ref(0);
const mapResolution = ref(0.05);
const mapOriginX = ref(0);
const mapOriginY = ref(0);
const mapOriginYaw = ref(0);
const mapFrameId = ref("map");
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const showScan = ref(true);
const showGlobalCostmap = ref(true);
const showLocalCostmap = ref(true);

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const MAP_ROTATION_DEG = -90;

const isDragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

const canvasTransformStyle = computed(() => ({
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${MAP_ROTATION_DEG}deg)`,
    transformOrigin: `${mapWidth.value / 2}px ${mapHeight.value / 2}px`,
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

function getRotatedMapSize() {
    const normalizedRotation = Math.abs(MAP_ROTATION_DEG) % 180;
    if (normalizedRotation === 90) {
        return { width: mapHeight.value, height: mapWidth.value };
    }
    return { width: mapWidth.value, height: mapHeight.value };
}

function normalizeFrameId(frameId: string | undefined) {
    if (!frameId) {
        return "";
    }
    return frameId.replace(/^\/+/, "");
}

function normalizeYaw(yaw: number) {
    let normalized = yaw;
    while (normalized > Math.PI) {
        normalized -= 2 * Math.PI;
    }
    while (normalized < -Math.PI) {
        normalized += 2 * Math.PI;
    }
    return normalized;
}

function quaternionToYaw(rotation: { x?: number; y?: number; z?: number; w?: number } | undefined) {
    if (!rotation) {
        return 0;
    }

    const x = typeof rotation.x === "number" ? rotation.x : 0;
    const y = typeof rotation.y === "number" ? rotation.y : 0;
    const z = typeof rotation.z === "number" ? rotation.z : 0;
    const w = typeof rotation.w === "number" ? rotation.w : 1;

    const sinyCosp = 2 * (w * z + x * y);
    const cosyCosp = 1 - 2 * (y * y + z * z);
    return Math.atan2(sinyCosp, cosyCosp);
}

function composePose(a: Pose2D, b: Pose2D): Pose2D {
    const cosA = Math.cos(a.yaw);
    const sinA = Math.sin(a.yaw);
    return {
        x: a.x + cosA * b.x - sinA * b.y,
        y: a.y + sinA * b.x + cosA * b.y,
        yaw: normalizeYaw(a.yaw + b.yaw)
    };
}

function invertPose(pose: Pose2D): Pose2D {
    const cosYaw = Math.cos(pose.yaw);
    const sinYaw = Math.sin(pose.yaw);
    return {
        x: -(cosYaw * pose.x + sinYaw * pose.y),
        y: sinYaw * pose.x - cosYaw * pose.y,
        yaw: normalizeYaw(-pose.yaw)
    };
}

function setTransform(parentFrame: string | undefined, childFrame: string | undefined, pose: Pose2D) {
    const parent = normalizeFrameId(parentFrame);
    const child = normalizeFrameId(childFrame);
    if (!parent || !child) {
        return;
    }
    tfTransforms.set(`${parent}|${child}`, pose);
}

function resolveTransform(targetFrame: string, sourceFrame: string) {
    const source = normalizeFrameId(sourceFrame);
    const target = normalizeFrameId(targetFrame);
    if (!source || !target) {
        return null;
    }
    if (source === target) {
        return { x: 0, y: 0, yaw: 0 };
    }

    const queue: Array<{ frame: string; pose: Pose2D }> = [{
        frame: source,
        pose: { x: 0, y: 0, yaw: 0 }
    }];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }

        if (current.frame === target) {
            return current.pose;
        }

        for (const [key, pose] of tfTransforms) {
            const separator = key.indexOf("|");
            const parent = key.slice(0, separator);
            const child = key.slice(separator + 1);

            if (child === current.frame && !visited.has(parent)) {
                visited.add(parent);
                queue.push({
                    frame: parent,
                    pose: composePose(pose, current.pose)
                });
            }

            if (parent === current.frame && !visited.has(child)) {
                visited.add(child);
                queue.push({
                    frame: child,
                    pose: composePose(invertPose(pose), current.pose)
                });
            }
        }
    }

    return null;
}

function updateTfTransforms(message: unknown) {
    const msg = message as TfMessage;
    if (!msg.transforms || !Array.isArray(msg.transforms)) {
        return;
    }

    for (const transform of msg.transforms) {
        const translation = transform.transform?.translation;
        const x = typeof translation?.x === "number" ? translation.x : 0;
        const y = typeof translation?.y === "number" ? translation.y : 0;
        const yaw = quaternionToYaw(transform.transform?.rotation);
        setTransform(transform.header?.frame_id, transform.child_frame_id, { x, y, yaw });
    }

    scheduleCostmapDraw();
    scheduleScanDraw();
}

function mapWorldToPixel(worldX: number, worldY: number) {
    if (mapResolution.value <= 0 || mapWidth.value <= 0 || mapHeight.value <= 0) {
        return null;
    }

    const dx = worldX - mapOriginX.value;
    const dy = worldY - mapOriginY.value;
    const cosYaw = Math.cos(mapOriginYaw.value);
    const sinYaw = Math.sin(mapOriginYaw.value);

    const localX = (dx * cosYaw + dy * sinYaw) / mapResolution.value;
    const localY = (-dx * sinYaw + dy * cosYaw) / mapResolution.value;

    const pixelX = localX;
    const pixelY = mapHeight.value - 1 - localY;
    return { x: pixelX, y: pixelY };
}

function drawScanOverlay() {
    if (!scanCanvas.value) {
        return;
    }

    const ctx = scanCanvas.value.getContext("2d");
    if (!ctx) {
        return;
    }

    const width = mapWidth.value;
    const height = mapHeight.value;
    if (width <= 0 || height <= 0) {
        return;
    }

    scanCanvas.value.width = width;
    scanCanvas.value.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!showScan.value || !latestScan || mapResolution.value <= 0) {
        return;
    }

    const mapToScan = resolveTransform(mapFrameId.value, latestScan.frameId);
    if (!mapToScan) {
        return;
    }

    const stride = Math.max(1, Math.floor(latestScan.ranges.length / 4000));

    ctx.fillStyle = "rgba(255, 70, 70, 0.9)";
    ctx.beginPath();

    for (let i = 0; i < latestScan.ranges.length; i += stride) {
        const range = latestScan.ranges[i];
        if (
            typeof range !== "number" ||
            !Number.isFinite(range) ||
            range < latestScan.rangeMin ||
            range > latestScan.rangeMax
        ) {
            continue;
        }

        const angle = latestScan.angleMin + i * latestScan.angleIncrement;
        const scanX = range * Math.cos(angle);
        const scanY = range * Math.sin(angle);

        const cosYaw = Math.cos(mapToScan.yaw);
        const sinYaw = Math.sin(mapToScan.yaw);
        const mapX = mapToScan.x + cosYaw * scanX - sinYaw * scanY;
        const mapY = mapToScan.y + sinYaw * scanX + cosYaw * scanY;
        const pixel = mapWorldToPixel(mapX, mapY);
        if (!pixel) {
            continue;
        }

        const x = pixel.x;
        const y = pixel.y;

        if (x < 0 || x >= width || y < 0 || y >= height) {
            continue;
        }

        ctx.rect(x, y, 1.4, 1.4);
    }

    ctx.fill();
}

function drawCostmapLayer(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    costmap: CostmapData,
    color: { r: number; g: number; b: number }
) {
    const frameToMap = resolveTransform(mapFrameId.value, costmap.frameId);
    if (!frameToMap) {
        return;
    }

    const originInMap = composePose(frameToMap, {
        x: costmap.originX,
        y: costmap.originY,
        yaw: costmap.originYaw
    });

    const cosYaw = Math.cos(originInMap.yaw);
    const sinYaw = Math.sin(originInMap.yaw);
    const safeLength = Math.min(costmap.data.length, costmap.width * costmap.height);

    for (let index = 0; index < safeLength; index++) {
        const value = costmap.data[index];
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
            continue;
        }

        const cx = index % costmap.width;
        const cy = Math.floor(index / costmap.width);
        const localX = (cx + 0.5) * costmap.resolution;
        const localY = (cy + 0.5) * costmap.resolution;

        const worldX = originInMap.x + cosYaw * localX - sinYaw * localY;
        const worldY = originInMap.y + sinYaw * localX + cosYaw * localY;
        const pixel = mapWorldToPixel(worldX, worldY);
        if (!pixel) {
            continue;
        }

        const px = Math.round(pixel.x);
        const py = Math.round(pixel.y);
        if (px < 0 || px >= width || py < 0 || py >= height) {
            continue;
        }

        const offset = (py * width + px) * 4;
        const alpha = Math.max(0.12, Math.min(0.9, value / 100)) * 255;
        const blend = alpha / 255;
        const r = rgba[offset] ?? 0;
        const g = rgba[offset + 1] ?? 0;
        const b = rgba[offset + 2] ?? 0;
        const a = rgba[offset + 3] ?? 0;

        rgba[offset] = Math.round(r * (1 - blend) + color.r * blend);
        rgba[offset + 1] = Math.round(g * (1 - blend) + color.g * blend);
        rgba[offset + 2] = Math.round(b * (1 - blend) + color.b * blend);
        rgba[offset + 3] = Math.max(a, alpha);
    }
}

function drawCostmapOverlay() {
    if (!costmapCanvas.value) {
        return;
    }

    const ctx = costmapCanvas.value.getContext("2d");
    if (!ctx) {
        return;
    }

    const width = mapWidth.value;
    const height = mapHeight.value;
    if (width <= 0 || height <= 0) {
        return;
    }

    costmapCanvas.value.width = width;
    costmapCanvas.value.height = height;

    const imageData = ctx.createImageData(width, height);
    const rgba = imageData.data;

    if (showGlobalCostmap.value && latestGlobalCostmap) {
        drawCostmapLayer(rgba, width, height, latestGlobalCostmap, { r: 251, g: 146, b: 60 });
    }

    if (showLocalCostmap.value && latestLocalCostmap) {
        drawCostmapLayer(rgba, width, height, latestLocalCostmap, { r: 56, g: 189, b: 248 });
    }

    ctx.putImageData(imageData, 0, 0);
}

function scheduleCostmapDraw() {
    if (costmapAnimationFrameId !== null) {
        return;
    }

    costmapAnimationFrameId = window.requestAnimationFrame(() => {
        costmapAnimationFrameId = null;
        drawCostmapOverlay();
    });
}

function scheduleScanDraw() {
    if (scanAnimationFrameId !== null) {
        return;
    }

    scanAnimationFrameId = window.requestAnimationFrame(() => {
        scanAnimationFrameId = null;
        drawScanOverlay();
    });
}

function toggleScanOverlay() {
    showScan.value = !showScan.value;
    scheduleScanDraw();
}

function toggleGlobalCostmapOverlay() {
    showGlobalCostmap.value = !showGlobalCostmap.value;
    scheduleCostmapDraw();
}

function toggleLocalCostmapOverlay() {
    showLocalCostmap.value = !showLocalCostmap.value;
    scheduleCostmapDraw();
}

function parseCostmapMessage(message: unknown) {
    const msg = message as OccupancyGridMessage;
    const width = toSafeDimension(msg.info?.width);
    const height = toSafeDimension(msg.info?.height);
    const resolution = msg.info?.resolution;

    if (
        !width ||
        !height ||
        typeof resolution !== "number" ||
        !Number.isFinite(resolution) ||
        resolution <= 0 ||
        !msg.data
    ) {
        return null;
    }

    const originX = msg.info?.origin?.position?.x;
    const originY = msg.info?.origin?.position?.y;
    return {
        frameId: normalizeFrameId(msg.header?.frame_id) || mapFrameId.value,
        width,
        height,
        resolution,
        originX: typeof originX === "number" && Number.isFinite(originX) ? originX : 0,
        originY: typeof originY === "number" && Number.isFinite(originY) ? originY : 0,
        originYaw: quaternionToYaw(msg.info?.origin?.orientation),
        data: msg.data
    } as CostmapData;
}

async function subscribeFirstAvailableTopic(topics: string[], onMessage: (message: unknown) => void) {
    for (const topicName of topics) {
        const topicType = await resolveExistingTopicType(topicName);
        if (!topicType) {
            continue;
        }

        const topic = createTopic(ros, topicName, topicType);
        topic.subscribe(onMessage);
        return topic;
    }

    return null;
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

    const rotatedSize = getRotatedMapSize();
    const fitScale = clamp(
        Math.min(viewportWidth / rotatedSize.width, viewportHeight / rotatedSize.height),
        MIN_SCALE,
        MAX_SCALE
    );

    scale.value = fitScale;
    translateX.value = (viewportWidth - rotatedSize.width * fitScale) / 2;
    translateY.value = (viewportHeight - rotatedSize.height * fitScale) / 2;
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
    if (costmapCanvas.value) {
        costmapCanvas.value.width = width;
        costmapCanvas.value.height = height;
    }
    if (scanCanvas.value) {
        scanCanvas.value.width = width;
        scanCanvas.value.height = height;
    }
    mapWidth.value = width;
    mapHeight.value = height;

    const imageData = ctx.createImageData(width, height);
    const rgba = imageData.data;
    const pixelCount = width * height;
    const safeLength = Math.min(data.length, pixelCount);

    for (let i = 0; i < pixelCount; i++) {
        const value = i < safeLength ? data[i] : -1;
        const color = value === 0 ? 255 : value === 100 ? 0 : 127;
        const x = i % width;
        const y = Math.floor(i / width);
        const flippedY = height - 1 - y;
        const offset = (flippedY * width + x) * 4;
        rgba[offset] = color;
        rgba[offset + 1] = color;
        rgba[offset + 2] = color;
        rgba[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    if (mapSizeChanged) {
        fitMapToViewport();
    }

    scheduleCostmapDraw();
    scheduleScanDraw();
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
        mapSubscriber = createTopic(ros, mapTopic, topicType);

        mapSubscriber.subscribe((message) => {
            const msg = message as {
                header?: {
                    frame_id?: string
                }
                width?: number
                height?: number
                info?: {
                    width?: number
                    height?: number
                    resolution?: number
                    origin?: {
                        position?: {
                            x?: number
                            y?: number
                        }
                        orientation?: {
                            x?: number
                            y?: number
                            z?: number
                            w?: number
                        }
                    }
                }
                data?: ArrayLike<number>
            };

            const width = toSafeDimension(msg.width ?? msg.info?.width);
            const height = toSafeDimension(msg.height ?? msg.info?.height);
            const resolution = msg.info?.resolution;
            if (typeof resolution === "number" && Number.isFinite(resolution) && resolution > 0) {
                mapResolution.value = resolution;
            }
            const frameId = normalizeFrameId(msg.header?.frame_id);
            if (frameId) {
                mapFrameId.value = frameId;
            }
            const originX = msg.info?.origin?.position?.x;
            const originY = msg.info?.origin?.position?.y;
            if (typeof originX === "number" && Number.isFinite(originX)) {
                mapOriginX.value = originX;
            }
            if (typeof originY === "number" && Number.isFinite(originY)) {
                mapOriginY.value = originY;
            }
            mapOriginYaw.value = quaternionToYaw(msg.info?.origin?.orientation);
            if (!width || !height || !msg.data) {
                return;
            }

            scheduleDraw(width, height, msg.data);
        });

        try {
            const scanTopicType = await resolveTopicType(scanTopic);
            scanSubscriber = createTopic(ros, scanTopic, scanTopicType);
            scanSubscriber.subscribe((message) => {
                const msg = message as {
                    header?: {
                        frame_id?: string
                    }
                    angle_min?: number
                    angle_increment?: number
                    range_min?: number
                    range_max?: number
                    ranges?: ArrayLike<number>
                };

                if (
                    typeof msg.angle_min !== "number" ||
                    typeof msg.angle_increment !== "number" ||
                    typeof msg.range_min !== "number" ||
                    typeof msg.range_max !== "number" ||
                    !msg.ranges
                ) {
                    return;
                }

                latestScan = {
                    angleMin: msg.angle_min,
                    angleIncrement: msg.angle_increment,
                    rangeMin: msg.range_min,
                    rangeMax: msg.range_max,
                    frameId: normalizeFrameId(msg.header?.frame_id) || "base_scan",
                    ranges: msg.ranges
                };
                scheduleScanDraw();
            });
        } catch (scanError) {
            console.warn("Failed to subscribe /scan topic:", scanError);
        }

        try {
            globalCostmapSubscriber = await subscribeFirstAvailableTopic(globalCostmapTopics, (message) => {
                const parsed = parseCostmapMessage(message);
                if (!parsed) {
                    return;
                }
                latestGlobalCostmap = parsed;
                scheduleCostmapDraw();
            });
            if (!globalCostmapSubscriber) {
                console.warn("Global costmap topic was not found.");
            }
        } catch (globalCostmapError) {
            console.warn("Failed to subscribe global costmap topic:", globalCostmapError);
        }

        try {
            localCostmapSubscriber = await subscribeFirstAvailableTopic(localCostmapTopics, (message) => {
                const parsed = parseCostmapMessage(message);
                if (!parsed) {
                    return;
                }
                latestLocalCostmap = parsed;
                scheduleCostmapDraw();
            });
            if (!localCostmapSubscriber) {
                console.warn("Local costmap topic was not found.");
            }
        } catch (localCostmapError) {
            console.warn("Failed to subscribe local costmap topic:", localCostmapError);
        }

        try {
            const tfTopicType = await resolveTopicType(tfTopic);
            tfSubscriber = createTopic(ros, tfTopic, tfTopicType);
            tfSubscriber.subscribe(updateTfTransforms);
        } catch (tfError) {
            console.warn("Failed to subscribe /tf topic:", tfError);
        }

        try {
            const tfStaticTopicType = await resolveTopicType(tfStaticTopic);
            tfStaticSubscriber = createTopic(ros, tfStaticTopic, tfStaticTopicType);
            tfStaticSubscriber.subscribe(updateTfTransforms);
        } catch (tfStaticError) {
            console.warn("Failed to subscribe /tf_static topic:", tfStaticError);
        }
    } catch (error) {
        throw new Error(`Failed to subscribe: ${String(error)}`);
    }
})

onBeforeUnmount(() => {
    window.removeEventListener("resize", fitMapToViewport);

    if (!mapSubscriber) {
        if (scanSubscriber) {
            scanSubscriber.unsubscribe();
            scanSubscriber = null;
        }
        if (globalCostmapSubscriber) {
            globalCostmapSubscriber.unsubscribe();
            globalCostmapSubscriber = null;
        }
        if (localCostmapSubscriber) {
            localCostmapSubscriber.unsubscribe();
            localCostmapSubscriber = null;
        }
        if (tfSubscriber) {
            tfSubscriber.unsubscribe();
            tfSubscriber = null;
        }
        if (tfStaticSubscriber) {
            tfStaticSubscriber.unsubscribe();
            tfStaticSubscriber = null;
        }
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (scanAnimationFrameId !== null) {
            window.cancelAnimationFrame(scanAnimationFrameId);
            scanAnimationFrameId = null;
        }
        if (costmapAnimationFrameId !== null) {
            window.cancelAnimationFrame(costmapAnimationFrameId);
            costmapAnimationFrameId = null;
        }
        pendingFrame = null;
        latestScan = null;
        latestGlobalCostmap = null;
        latestLocalCostmap = null;
        return;
    }
    mapSubscriber.unsubscribe();
    mapSubscriber = null;
    if (scanSubscriber) {
        scanSubscriber.unsubscribe();
        scanSubscriber = null;
    }
    if (globalCostmapSubscriber) {
        globalCostmapSubscriber.unsubscribe();
        globalCostmapSubscriber = null;
    }
    if (localCostmapSubscriber) {
        localCostmapSubscriber.unsubscribe();
        localCostmapSubscriber = null;
    }
    if (tfSubscriber) {
        tfSubscriber.unsubscribe();
        tfSubscriber = null;
    }
    if (tfStaticSubscriber) {
        tfStaticSubscriber.unsubscribe();
        tfStaticSubscriber = null;
    }

    if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (scanAnimationFrameId !== null) {
        window.cancelAnimationFrame(scanAnimationFrameId);
        scanAnimationFrameId = null;
    }
    if (costmapAnimationFrameId !== null) {
        window.cancelAnimationFrame(costmapAnimationFrameId);
        costmapAnimationFrameId = null;
    }
    pendingFrame = null;
    latestScan = null;
    latestGlobalCostmap = null;
    latestLocalCostmap = null;
    tfTransforms.clear();
});
</script>