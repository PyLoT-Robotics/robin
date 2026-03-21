<template>
  <div class="w-full h-full flex flex-col text-zinc-400">
    <div class="flex flex-wrap justify-center border-b border-border">
      <button
        class="flex flex-row items-center gap-2 border-x border-border px-4 py-2 transition-colors"
        :class="isInitialPoseMode ? 'bg-orange-500/30 text-orange-200' : ''"
        @click="toggleInitialPoseMode"
      >
        <Icon icon="material-symbols:pin-drop" class="size-6" />
        <p class="text-2xl">2D Pose Estimate</p>
      </button>
      <button
        class="flex flex-row items-center gap-2 border-x border-border px-4 py-2 transition-colors"
        :class="isNav2GoalMode ? 'bg-sky-500/30 text-sky-100' : ''"
        @click="toggleNav2GoalMode"
      >
        <Icon icon="material-symbols:pin-drop-outline" class="size-6" />
        <p class="text-2xl">Nav2 Goal</p>
      </button>
    </div>
    <div
      ref="viewport"
      class="relative touch-none grow overflow-hidden"
      :style="{ cursor: viewportCursor }"
      @wheel.prevent="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @pointerleave="handlePointerUp"
      @dblclick="fitMapToViewport"
    >
      <BaseMapLayer :layer-style="canvasTransformStyle" :map-frame="currentMapFrame" />
      <CostmapLayer
        :layer-style="canvasTransformStyle"
        :map-width="mapWidth"
        :map-height="mapHeight"
        :map-frame-id="mapFrameId"
        :map-resolution="mapResolution"
        :map-origin-x="mapOriginX"
        :map-origin-y="mapOriginY"
        :map-origin-yaw="mapOriginYaw"
        :global-costmap="latestGlobalCostmap"
        :local-costmap="latestLocalCostmap"
        :tf-transforms="tfTransforms"
        :tf-version="tfVersion"
      />
      <ScanLayer
        :layer-style="canvasTransformStyle"
        :map-width="mapWidth"
        :map-height="mapHeight"
        :map-frame-id="mapFrameId"
        :map-resolution="mapResolution"
        :map-origin-x="mapOriginX"
        :map-origin-y="mapOriginY"
        :map-origin-yaw="mapOriginYaw"
        :latest-scan="latestScan"
        :tf-transforms="tfTransforms"
        :tf-version="tfVersion"
      />
      <GlobalPathLayer
        :layer-style="canvasTransformStyle"
        :map-width="mapWidth"
        :map-height="mapHeight"
        :map-frame-id="mapFrameId"
        :map-resolution="mapResolution"
        :map-origin-x="mapOriginX"
        :map-origin-y="mapOriginY"
        :map-origin-yaw="mapOriginYaw"
        :latest-global-path="latestGlobalPath"
        :tf-transforms="tfTransforms"
        :tf-version="tfVersion"
      />
      <PoseOverlayLayer
        :map-width="mapWidth"
        :map-height="mapHeight"
        :map-resolution="mapResolution"
        :map-origin-x="mapOriginX"
        :map-origin-y="mapOriginY"
        :map-origin-yaw="mapOriginYaw"
        :translate-x="translateX"
        :translate-y="translateY"
        :scale="scale"
        :map-rotation-deg="MAP_ROTATION_DEG"
        :robot-pose="robotPoseInMap"
        :is-pose-interaction-mode="isPoseInteractionMode"
        :is-pose-dragging="isPoseDragging"
        :is-initial-pose-mode="isInitialPoseMode"
        :pose-drag-start-screen="poseDragStartScreen"
        :pose-drag-current-screen="poseDragCurrentScreen"
        :tf-version="tfVersion"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { createAction, createTopic, type Action, type Ros, type Topic } from '@/api/ros'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import BaseMapLayer from '@/components/map/layers/BaseMapLayer.vue'
import CostmapLayer from '@/components/map/layers/CostmapLayer.vue'
import ScanLayer from '@/components/map/layers/ScanLayer.vue'
import GlobalPathLayer from '@/components/map/layers/GlobalPathLayer.vue'
import PoseOverlayLayer from '@/components/map/layers/PoseOverlayLayer.vue'
import {
  mapPixelToWorld,
  viewportPointToMapPixel as toMapPixelFromViewport,
} from '@/utils/map/coordinates'
import { clamp, quaternionToYaw, yawToQuaternion } from '@/utils/map/math'
import { normalizeFrameId, resolveTransform, setTransform } from '@/utils/map/transformGraph'
import type {
  CostmapData,
  GlobalPathData,
  LaserScanData,
  MapFrameData,
  OccupancyGridMessage,
  PathMessage,
  Pose2D,
  ScreenPoint,
  TfMessage,
} from '@/utils/map/types'

const { ros } = defineProps<{ ros: Ros }>()
const mapTopic = '/map'
const scanTopic = '/scan'
const tfTopic = '/tf'
const tfStaticTopic = '/tf_static'
const initialPoseTopic = '/initialpose'
const nav2GoalDefaultActionServer = '/navigate_to_pose'
const nav2GoalDefaultActionType = 'nav2_msgs/action/NavigateToPose'
const globalCostmapTopics = ['/move_base/global_costmap/costmap', '/global_costmap/costmap']
const localCostmapTopics = ['/move_base/local_costmap/costmap', '/local_costmap/costmap']
const globalPathTopics = [
  '/plan',
  '/global_plan',
  '/move_base/NavfnROS/plan',
  '/move_base/GlobalPlanner/plan',
]
const robotBaseFrameCandidates = ['base_link', 'base_footprint', 'base_chassis', 'base_stabilized']

let mapSubscriber: Topic | null = null
let scanSubscriber: Topic | null = null
let tfSubscriber: Topic | null = null
let tfStaticSubscriber: Topic | null = null
let globalCostmapSubscriber: Topic | null = null
let localCostmapSubscriber: Topic | null = null
let globalPathSubscriber: Topic | null = null
let initialPosePublisher: Topic | null = null
let nav2Action: Action | null = null
let nav2ResolvedActionServer = nav2GoalDefaultActionServer
let nav2ResolvedActionType = nav2GoalDefaultActionType

type PoseInteractionMode = 'none' | 'initial_pose' | 'nav2_goal'

function resolveTopicType(topicName: string) {
  return new Promise<string>((resolve) => {
    ros.getTopicType(topicName, (topicType) => {
      resolve(topicType && topicType.length > 0 ? topicType : 'std_msgs/String')
    })
  })
}

function resolveExistingTopicType(topicName: string) {
  return new Promise<string | null>((resolve) => {
    ros.getTopicType(topicName, (topicType) => {
      if (topicType && topicType.length > 0) {
        resolve(topicType)
        return
      }
      resolve(null)
    })
  })
}

const viewport = ref<HTMLDivElement>()
const currentMapFrame = ref<MapFrameData | null>(null)
const latestScan = ref<LaserScanData | null>(null)
const latestGlobalCostmap = ref<CostmapData | null>(null)
const latestLocalCostmap = ref<CostmapData | null>(null)
const latestGlobalPath = ref<GlobalPathData | null>(null)
const tfTransforms = new Map<string, Pose2D>()
const tfVersion = ref(0)
const mapWidth = ref(0)
const mapHeight = ref(0)
const mapResolution = ref(0.05)
const mapOriginX = ref(0)
const mapOriginY = ref(0)
const mapOriginYaw = ref(0)
const mapFrameId = ref('map')
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const poseInteractionMode = ref<PoseInteractionMode>('none')
const isInitialPoseMode = computed(() => poseInteractionMode.value === 'initial_pose')
const isNav2GoalMode = computed(() => poseInteractionMode.value === 'nav2_goal')
const isPoseInteractionMode = computed(() => poseInteractionMode.value !== 'none')
const isPoseDragging = ref(false)

const MIN_SCALE = 0.25
const MAX_SCALE = 8
const MAP_ROTATION_DEG = -90

const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0
let activePointerId: number | null = null
const activeTouchPoints = new Map<number, { x: number; y: number }>()
let pinchDistance = 0
let pinchCenter: { x: number; y: number } | null = null
let poseDragStartScreen: ScreenPoint | null = null
let poseDragCurrentScreen: ScreenPoint | null = null
let poseDragStartWorld: { x: number; y: number } | null = null

const canvasTransformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${MAP_ROTATION_DEG}deg)`,
  transformOrigin: `${mapWidth.value / 2}px ${mapHeight.value / 2}px`,
  imageRendering: 'pixelated' as const,
}))

const viewportCursor = computed(() => {
  if (isPoseInteractionMode.value) {
    if (isPoseDragging.value) {
      return 'crosshair'
    }
    return 'cell'
  }
  if (isDragging.value) {
    return 'grabbing'
  }
  return 'grab'
})

const robotPoseInMap = computed(() => {
  void tfVersion.value
  return resolveRobotPoseInMap()
})

function toSafeDimension(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  const normalized = Math.floor(value)
  return normalized > 0 ? normalized : null
}

function getRotatedMapSize() {
  const normalizedRotation = Math.abs(MAP_ROTATION_DEG) % 180
  if (normalizedRotation === 90) {
    return { width: mapHeight.value, height: mapWidth.value }
  }
  return { width: mapWidth.value, height: mapHeight.value }
}

function updateTfTransforms(message: unknown) {
  const msg = message as TfMessage
  if (!msg.transforms || !Array.isArray(msg.transforms)) {
    return
  }

  for (const transform of msg.transforms) {
    const translation = transform.transform?.translation
    const x = typeof translation?.x === 'number' ? translation.x : 0
    const y = typeof translation?.y === 'number' ? translation.y : 0
    const yaw = quaternionToYaw(transform.transform?.rotation)
    setTransform(tfTransforms, transform.header?.frame_id, transform.child_frame_id, { x, y, yaw })
  }
  tfVersion.value += 1
}

function viewportClientPointToMapPixel(clientX: number, clientY: number) {
  if (!viewport.value || mapWidth.value <= 0 || mapHeight.value <= 0 || scale.value <= 0) {
    return null
  }

  const rect = viewport.value.getBoundingClientRect()
  const px = clientX - rect.left
  const py = clientY - rect.top

  return toMapPixelFromViewport(
    mapWidth.value,
    mapHeight.value,
    {
      translateX: translateX.value,
      translateY: translateY.value,
      scale: scale.value,
      rotationDeg: MAP_ROTATION_DEG,
    },
    px,
    py,
  )
}

function viewportPointToWorld(clientX: number, clientY: number) {
  const pixel = viewportClientPointToMapPixel(clientX, clientY)
  if (!pixel) {
    return null
  }
  return mapPixelToWorld(
    {
      width: mapWidth.value,
      height: mapHeight.value,
      resolution: mapResolution.value,
      originX: mapOriginX.value,
      originY: mapOriginY.value,
      originYaw: mapOriginYaw.value,
    },
    pixel.x,
    pixel.y,
  )
}

function resolveRobotPoseInMap() {
  for (const frameId of robotBaseFrameCandidates) {
    const pose = resolveTransform(tfTransforms, mapFrameId.value, frameId)
    if (pose) {
      return pose
    }
  }
  return null
}

function ensureInitialPosePublisher() {
  if (initialPosePublisher) {
    return initialPosePublisher
  }

  initialPosePublisher = createTopic(
    ros,
    initialPoseTopic,
    'geometry_msgs/PoseWithCovarianceStamped',
  )
  return initialPosePublisher
}

function publishInitialPose(position: { x: number; y: number }, yaw: number) {
  const publisher = ensureInitialPosePublisher()
  const quaternion = yawToQuaternion(yaw)
  const covariance = Array(36).fill(0)
  covariance[0] = 0.25
  covariance[7] = 0.25
  covariance[35] = 0.06853891945200942

  publisher.publish({
    header: {
      frame_id: mapFrameId.value,
    },
    pose: {
      pose: {
        position: {
          x: position.x,
          y: position.y,
          z: 0,
        },
        orientation: quaternion,
      },
      covariance,
    },
  })
}

function ensureNav2ActionClient() {
  if (nav2Action) {
    return nav2Action
  }

  nav2Action = createAction(ros, nav2ResolvedActionServer, nav2ResolvedActionType)
  return nav2Action
}

function parseActionTypeFromFeedbackType(feedbackType: string) {
  const suffix = '_FeedbackMessage'
  if (!feedbackType.endsWith(suffix)) {
    return null
  }
  return feedbackType.slice(0, -suffix.length)
}

async function resolveNav2ActionConfig() {
  const candidateNames = [nav2GoalDefaultActionServer, '/bt_navigator/navigate_to_pose']

  for (const actionName of candidateNames) {
    const feedbackType = await resolveExistingTopicType(`${actionName}/_action/feedback`)
    if (!feedbackType) {
      continue
    }

    const resolvedType = parseActionTypeFromFeedbackType(feedbackType)
    if (!resolvedType) {
      continue
    }

    nav2ResolvedActionServer = actionName
    nav2ResolvedActionType = resolvedType
    nav2Action = null
    console.info('Resolved Nav2 action endpoint:', {
      action: nav2ResolvedActionServer,
      actionType: nav2ResolvedActionType,
    })
    return
  }

  nav2ResolvedActionServer = nav2GoalDefaultActionServer
  nav2ResolvedActionType = nav2GoalDefaultActionType
}

function sendNav2Goal(position: { x: number; y: number }, yaw: number) {
  const quaternion = yawToQuaternion(yaw)

  const goalPayload = {
    pose: {
      header: {
        frame_id: mapFrameId.value,
      },
      pose: {
        position: {
          x: position.x,
          y: position.y,
          z: 0,
        },
        orientation: quaternion,
      },
    },
    behavior_tree: '',
  }

  const fallbackTypes = Array.from(
    new Set([
      nav2ResolvedActionType,
      'nav2_msgs/action/NavigateToPose',
      'nav2_msgs/NavigateToPose',
    ]),
  )

  const sendWithType = (attempt: number) => {
    const actionType = fallbackTypes[attempt]
    if (!actionType) {
      console.error('Nav2 goal failed: no compatible action type found', {
        action: nav2ResolvedActionServer,
        attemptedTypes: fallbackTypes,
        goal: goalPayload,
      })
      return
    }

    nav2ResolvedActionType = actionType
    nav2Action = null
    const action = ensureNav2ActionClient()

    action.sendGoal(
      goalPayload,
      (result) => {
        console.info('Nav2 goal finished', result)
      },
      (feedback) => {
        console.debug('Nav2 goal feedback', feedback)
      },
      (error) => {
        console.error('Nav2 goal attempt failed', {
          error,
          action: nav2ResolvedActionServer,
          actionType,
          goal: goalPayload,
        })
        sendWithType(attempt + 1)
      },
    )

    console.info('Nav2 goal sent', {
      action: nav2ResolvedActionServer,
      actionType,
      goal: goalPayload,
    })
  }

  sendWithType(0)
}

function toggleInitialPoseMode() {
  poseInteractionMode.value = isInitialPoseMode.value ? 'none' : 'initial_pose'
  isPoseDragging.value = false
  poseDragStartScreen = null
  poseDragCurrentScreen = null
  poseDragStartWorld = null
  activePointerId = null
}

function toggleNav2GoalMode() {
  poseInteractionMode.value = isNav2GoalMode.value ? 'none' : 'nav2_goal'
  isPoseDragging.value = false
  poseDragStartScreen = null
  poseDragCurrentScreen = null
  poseDragStartWorld = null
  activePointerId = null
}

function parseCostmapMessage(message: unknown) {
  const msg = message as OccupancyGridMessage
  const width = toSafeDimension(msg.info?.width)
  const height = toSafeDimension(msg.info?.height)
  const resolution = msg.info?.resolution

  if (
    !width ||
    !height ||
    typeof resolution !== 'number' ||
    !Number.isFinite(resolution) ||
    resolution <= 0 ||
    !msg.data
  ) {
    return null
  }

  const originX = msg.info?.origin?.position?.x
  const originY = msg.info?.origin?.position?.y
  return {
    frameId: normalizeFrameId(msg.header?.frame_id) || mapFrameId.value,
    width,
    height,
    resolution,
    originX: typeof originX === 'number' && Number.isFinite(originX) ? originX : 0,
    originY: typeof originY === 'number' && Number.isFinite(originY) ? originY : 0,
    originYaw: quaternionToYaw(msg.info?.origin?.orientation),
    data: msg.data,
  } as CostmapData
}

function parsePathMessage(message: unknown) {
  const msg = message as PathMessage
  if (!Array.isArray(msg.poses)) {
    return null
  }

  const points: Array<{ x: number; y: number }> = []
  for (const poseStamped of msg.poses) {
    const x = poseStamped?.pose?.position?.x
    const y = poseStamped?.pose?.position?.y
    if (
      typeof x !== 'number' ||
      !Number.isFinite(x) ||
      typeof y !== 'number' ||
      !Number.isFinite(y)
    ) {
      continue
    }
    points.push({ x, y })
  }

  return {
    frameId: normalizeFrameId(msg.header?.frame_id) || mapFrameId.value,
    points,
  }
}

async function subscribeFirstAvailableTopic(
  topics: string[],
  onMessage: (message: unknown) => void,
) {
  for (const topicName of topics) {
    const topicType = await resolveExistingTopicType(topicName)
    if (!topicType) {
      continue
    }

    const topic = createTopic(ros, topicName, topicType)
    topic.subscribe(onMessage)
    return topic
  }

  return null
}

function fitMapToViewport() {
  if (!viewport.value || mapWidth.value <= 0 || mapHeight.value <= 0) {
    return
  }

  const viewportWidth = viewport.value.clientWidth
  const viewportHeight = viewport.value.clientHeight
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return
  }

  const rotatedSize = getRotatedMapSize()
  const fitScale = clamp(
    Math.min(viewportWidth / rotatedSize.width, viewportHeight / rotatedSize.height),
    MIN_SCALE,
    MAX_SCALE,
  )

  scale.value = fitScale
  translateX.value = (viewportWidth - rotatedSize.width * fitScale) / 2
  translateY.value = (viewportHeight - rotatedSize.height * fitScale) / 2
}

function zoomAt(nextScale: number, centerX: number, centerY: number) {
  const safeScale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  const prevScale = scale.value
  if (safeScale === prevScale) {
    return
  }

  translateX.value = centerX - ((centerX - translateX.value) * safeScale) / prevScale
  translateY.value = centerY - ((centerY - translateY.value) * safeScale) / prevScale
  scale.value = safeScale
}

function handleWheel(event: WheelEvent) {
  if (!viewport.value) {
    return
  }

  const rect = viewport.value.getBoundingClientRect()
  const centerX = event.clientX - rect.left
  const centerY = event.clientY - rect.top
  const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1
  zoomAt(scale.value * zoomFactor, centerX, centerY)
}

function getPointerPositionInViewport(event: PointerEvent) {
  if (!viewport.value) {
    return null
  }
  const rect = viewport.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function readPinchState() {
  const points = Array.from(activeTouchPoints.values())
  const a = points[0]
  const b = points[1]
  if (!a || !b) {
    return null
  }

  const dx = b.x - a.x
  const dy = b.y - a.y
  const distance = Math.hypot(dx, dy)
  if (!Number.isFinite(distance) || distance <= 0) {
    return null
  }

  return {
    distance,
    center: {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    },
  }
}

function resetPinchState() {
  pinchDistance = 0
  pinchCenter = null
}

function beginPinchIfReady() {
  const pinch = readPinchState()
  if (!pinch) {
    return false
  }

  pinchDistance = pinch.distance
  pinchCenter = pinch.center
  isDragging.value = false
  activePointerId = null
  return true
}

function updatePinchGesture() {
  if (activeTouchPoints.size < 2) {
    return false
  }

  const pinch = readPinchState()
  if (!pinch) {
    return false
  }

  if (pinchDistance <= 0 || !pinchCenter) {
    pinchDistance = pinch.distance
    pinchCenter = pinch.center
    return true
  }

  const centerDx = pinch.center.x - pinchCenter.x
  const centerDy = pinch.center.y - pinchCenter.y
  translateX.value += centerDx
  translateY.value += centerDy

  const zoomRatio = pinch.distance / pinchDistance
  zoomAt(scale.value * zoomRatio, pinch.center.x, pinch.center.y)

  pinchDistance = pinch.distance
  pinchCenter = pinch.center
  return true
}

function handlePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  if (!viewport.value) {
    return
  }

  viewport.value.setPointerCapture(event.pointerId)

  const pointerPosition = getPointerPositionInViewport(event)

  if (!isPoseInteractionMode.value && event.pointerType === 'touch' && pointerPosition) {
    activeTouchPoints.set(event.pointerId, pointerPosition)

    if (activeTouchPoints.size >= 2) {
      beginPinchIfReady()
      return
    }
  }

  if (isPoseInteractionMode.value) {
    const world = viewportPointToWorld(event.clientX, event.clientY)
    if (!world) {
      return
    }

    const rect = viewport.value.getBoundingClientRect()
    poseDragStartScreen = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    poseDragCurrentScreen = { ...poseDragStartScreen }
    poseDragStartWorld = world
    isPoseDragging.value = true
    activePointerId = event.pointerId
    return
  }

  isDragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = translateX.value
  dragOriginY = translateY.value
  activePointerId = event.pointerId
}

function handlePointerMove(event: PointerEvent) {
  if (!isPoseInteractionMode.value && event.pointerType === 'touch') {
    const pointerPosition = getPointerPositionInViewport(event)
    if (pointerPosition) {
      activeTouchPoints.set(event.pointerId, pointerPosition)
    }

    if (activeTouchPoints.size >= 2) {
      updatePinchGesture()
      return
    }
  }

  if (isPoseInteractionMode.value) {
    if (!isPoseDragging.value || event.pointerId !== activePointerId || !viewport.value) {
      return
    }
    const rect = viewport.value.getBoundingClientRect()
    poseDragCurrentScreen = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    return
  }

  if (!isDragging.value || event.pointerId !== activePointerId) {
    return
  }

  translateX.value = dragOriginX + (event.clientX - dragStartX)
  translateY.value = dragOriginY + (event.clientY - dragStartY)
}

function handlePointerUp(event: PointerEvent) {
  if (viewport.value && viewport.value.hasPointerCapture(event.pointerId)) {
    viewport.value.releasePointerCapture(event.pointerId)
  }

  if (!isPoseInteractionMode.value && event.pointerType === 'touch') {
    activeTouchPoints.delete(event.pointerId)

    if (activeTouchPoints.size >= 2) {
      beginPinchIfReady()
      return
    }

    resetPinchState()

    if (activeTouchPoints.size === 1) {
      const remaining = activeTouchPoints.entries().next().value
      if (remaining) {
        activePointerId = remaining[0]
        dragStartX = remaining[1].x
        dragStartY = remaining[1].y
        dragOriginX = translateX.value
        dragOriginY = translateY.value
        isDragging.value = true
        return
      }
    }
  }

  if (isPoseInteractionMode.value) {
    if (!isPoseDragging.value || event.pointerId !== activePointerId) {
      return
    }

    const startWorld = poseDragStartWorld
    const endWorld = viewportPointToWorld(event.clientX, event.clientY)
    if (startWorld && endWorld) {
      const dx = endWorld.x - startWorld.x
      const dy = endWorld.y - startWorld.y
      const yaw = Math.hypot(dx, dy) < 1e-4 ? 0 : Math.atan2(dy, dx)
      if (isInitialPoseMode.value) {
        publishInitialPose(startWorld, yaw)
      } else if (isNav2GoalMode.value) {
        sendNav2Goal(startWorld, yaw)
      }
    }

    isPoseDragging.value = false
    poseDragStartScreen = null
    poseDragCurrentScreen = null
    poseDragStartWorld = null
    activePointerId = null
    activeTouchPoints.clear()
    resetPinchState()
    return
  }

  isDragging.value = false
  activePointerId = null
}

onMounted(async () => {
  window.addEventListener('resize', fitMapToViewport)

  try {
    const topicType = await resolveTopicType(mapTopic)
    mapSubscriber = createTopic(ros, mapTopic, topicType)

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
      }

      const width = toSafeDimension(msg.width ?? msg.info?.width)
      const height = toSafeDimension(msg.height ?? msg.info?.height)
      const resolution = msg.info?.resolution
      if (typeof resolution === 'number' && Number.isFinite(resolution) && resolution > 0) {
        mapResolution.value = resolution
      }
      const frameId = normalizeFrameId(msg.header?.frame_id)
      if (frameId) {
        mapFrameId.value = frameId
      }
      const originX = msg.info?.origin?.position?.x
      const originY = msg.info?.origin?.position?.y
      if (typeof originX === 'number' && Number.isFinite(originX)) {
        mapOriginX.value = originX
      }
      if (typeof originY === 'number' && Number.isFinite(originY)) {
        mapOriginY.value = originY
      }
      mapOriginYaw.value = quaternionToYaw(msg.info?.origin?.orientation)
      if (!width || !height || !msg.data) {
        return
      }

      const mapSizeChanged = width !== mapWidth.value || height !== mapHeight.value
      mapWidth.value = width
      mapHeight.value = height
      currentMapFrame.value = { width, height, data: msg.data }
      if (mapSizeChanged) {
        fitMapToViewport()
      }
    })

    try {
      const scanTopicType = await resolveTopicType(scanTopic)
      scanSubscriber = createTopic(ros, scanTopic, scanTopicType)
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
        }

        if (
          typeof msg.angle_min !== 'number' ||
          typeof msg.angle_increment !== 'number' ||
          typeof msg.range_min !== 'number' ||
          typeof msg.range_max !== 'number' ||
          !msg.ranges
        ) {
          return
        }

        latestScan.value = {
          angleMin: msg.angle_min,
          angleIncrement: msg.angle_increment,
          rangeMin: msg.range_min,
          rangeMax: msg.range_max,
          frameId: normalizeFrameId(msg.header?.frame_id) || 'base_scan',
          ranges: msg.ranges,
        }
      })
    } catch (scanError) {
      console.warn('Failed to subscribe /scan topic:', scanError)
    }

    try {
      globalCostmapSubscriber = await subscribeFirstAvailableTopic(
        globalCostmapTopics,
        (message) => {
          const parsed = parseCostmapMessage(message)
          if (!parsed) {
            return
          }
          latestGlobalCostmap.value = parsed
        },
      )
      if (!globalCostmapSubscriber) {
        console.warn('Global costmap topic was not found.')
      }
    } catch (globalCostmapError) {
      console.warn('Failed to subscribe global costmap topic:', globalCostmapError)
    }

    try {
      localCostmapSubscriber = await subscribeFirstAvailableTopic(localCostmapTopics, (message) => {
        const parsed = parseCostmapMessage(message)
        if (!parsed) {
          return
        }
        latestLocalCostmap.value = parsed
      })
      if (!localCostmapSubscriber) {
        console.warn('Local costmap topic was not found.')
      }
    } catch (localCostmapError) {
      console.warn('Failed to subscribe local costmap topic:', localCostmapError)
    }

    try {
      globalPathSubscriber = await subscribeFirstAvailableTopic(globalPathTopics, (message) => {
        const parsed = parsePathMessage(message)
        if (!parsed) {
          return
        }
        latestGlobalPath.value = parsed
      })
      if (!globalPathSubscriber) {
        console.warn('Global planner path topic was not found.')
      }
    } catch (globalPathError) {
      console.warn('Failed to subscribe global planner path topic:', globalPathError)
    }

    try {
      const tfTopicType = await resolveTopicType(tfTopic)
      tfSubscriber = createTopic(ros, tfTopic, tfTopicType)
      tfSubscriber.subscribe(updateTfTransforms)
    } catch (tfError) {
      console.warn('Failed to subscribe /tf topic:', tfError)
    }

    try {
      const tfStaticTopicType = await resolveTopicType(tfStaticTopic)
      tfStaticSubscriber = createTopic(ros, tfStaticTopic, tfStaticTopicType)
      tfStaticSubscriber.subscribe(updateTfTransforms)
    } catch (tfStaticError) {
      console.warn('Failed to subscribe /tf_static topic:', tfStaticError)
    }

    try {
      await resolveNav2ActionConfig()
    } catch (nav2ResolveError) {
      console.warn('Failed to resolve Nav2 action endpoint, using defaults.', nav2ResolveError)
    }
  } catch (error) {
    throw new Error(`Failed to subscribe: ${String(error)}`)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitMapToViewport)

  if (!mapSubscriber) {
    if (scanSubscriber) {
      scanSubscriber.unsubscribe()
      scanSubscriber = null
    }
    if (globalCostmapSubscriber) {
      globalCostmapSubscriber.unsubscribe()
      globalCostmapSubscriber = null
    }
    if (localCostmapSubscriber) {
      localCostmapSubscriber.unsubscribe()
      localCostmapSubscriber = null
    }
    if (globalPathSubscriber) {
      globalPathSubscriber.unsubscribe()
      globalPathSubscriber = null
    }
    if (tfSubscriber) {
      tfSubscriber.unsubscribe()
      tfSubscriber = null
    }
    if (tfStaticSubscriber) {
      tfStaticSubscriber.unsubscribe()
      tfStaticSubscriber = null
    }
    currentMapFrame.value = null
    latestScan.value = null
    latestGlobalCostmap.value = null
    latestLocalCostmap.value = null
    latestGlobalPath.value = null
    activeTouchPoints.clear()
    resetPinchState()
    return
  }
  mapSubscriber.unsubscribe()
  mapSubscriber = null
  if (scanSubscriber) {
    scanSubscriber.unsubscribe()
    scanSubscriber = null
  }
  if (globalCostmapSubscriber) {
    globalCostmapSubscriber.unsubscribe()
    globalCostmapSubscriber = null
  }
  if (localCostmapSubscriber) {
    localCostmapSubscriber.unsubscribe()
    localCostmapSubscriber = null
  }
  if (globalPathSubscriber) {
    globalPathSubscriber.unsubscribe()
    globalPathSubscriber = null
  }
  if (tfSubscriber) {
    tfSubscriber.unsubscribe()
    tfSubscriber = null
  }
  if (tfStaticSubscriber) {
    tfStaticSubscriber.unsubscribe()
    tfStaticSubscriber = null
  }
  currentMapFrame.value = null
  latestScan.value = null
  latestGlobalCostmap.value = null
  latestLocalCostmap.value = null
  latestGlobalPath.value = null
  activeTouchPoints.clear()
  resetPinchState()
  tfTransforms.clear()
})
</script>