<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
  }>(),
  {
    alt: '工作区图片',
  },
)

const viewportRef = ref<HTMLDivElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isPanning = ref(false)

let panPointerId: number | null = null
let panStartX = 0
let panStartY = 0
let panStartTranslateX = 0
let panStartTranslateY = 0

const MIN_SCALE = 0.05
const MAX_SCALE = 20

const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
}))

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

function fitImageToViewport(): void {
  const viewport = viewportRef.value
  const image = imageRef.value
  if (!viewport || !image || !image.naturalWidth || !image.naturalHeight) {
    return
  }

  const { width: viewportWidth, height: viewportHeight } = viewport.getBoundingClientRect()
  const padding = 48
  const availableWidth = Math.max(viewportWidth - padding * 2, 1)
  const availableHeight = Math.max(viewportHeight - padding * 2, 1)

  const fitScale = Math.min(
    availableWidth / image.naturalWidth,
    availableHeight / image.naturalHeight,
    1,
  )

  scale.value = fitScale
  translateX.value = (viewportWidth - image.naturalWidth * fitScale) / 2
  translateY.value = (viewportHeight - image.naturalHeight * fitScale) / 2
}

function zoomAt(clientX: number, clientY: number, delta: number): void {
  const viewport = viewportRef.value
  if (!viewport) {
    return
  }

  const rect = viewport.getBoundingClientRect()
  const pointerX = clientX - rect.left
  const pointerY = clientY - rect.top

  const previousScale = scale.value
  const nextScale = clampScale(previousScale * (1 - delta * 0.001))

  if (nextScale === previousScale) {
    return
  }

  const imageX = (pointerX - translateX.value) / previousScale
  const imageY = (pointerY - translateY.value) / previousScale

  translateX.value = pointerX - imageX * nextScale
  translateY.value = pointerY - imageY * nextScale
  scale.value = nextScale
}

function onWheel(event: WheelEvent): void {
  event.preventDefault()
  zoomAt(event.clientX, event.clientY, event.deltaY)
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 1) {
    return
  }

  event.preventDefault()

  isPanning.value = true
  panPointerId = event.pointerId
  panStartX = event.clientX
  panStartY = event.clientY
  panStartTranslateX = translateX.value
  panStartTranslateY = translateY.value

  viewportRef.value?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!isPanning.value || event.pointerId !== panPointerId) {
    return
  }

  translateX.value = panStartTranslateX + (event.clientX - panStartX)
  translateY.value = panStartTranslateY + (event.clientY - panStartY)
}

function endPan(event: PointerEvent): void {
  if (!isPanning.value || event.pointerId !== panPointerId) {
    return
  }

  isPanning.value = false
  panPointerId = null

  if (viewportRef.value?.hasPointerCapture?.(event.pointerId)) {
    viewportRef.value.releasePointerCapture(event.pointerId)
  }
}

function onAuxClick(event: MouseEvent): void {
  if (event.button === 1) {
    event.preventDefault()
  }
}

function onImageLoad(): void {
  fitImageToViewport()
}

watch(
  () => props.src,
  () => {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  },
)
</script>

<template>
  <div
    ref="viewportRef"
    class="relative h-full w-full touch-none overflow-hidden select-none"
    :class="isPanning ? 'cursor-grabbing' : ''"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endPan"
    @pointercancel="endPan"
    @auxclick="onAuxClick"
  >
    <div class="absolute inset-0" :style="contentStyle">
      <img
        ref="imageRef"
        :src="src"
        :alt="alt"
        draggable="false"
        class="block max-w-none"
        @load="onImageLoad"
        @dragstart.prevent
      />
    </div>
  </div>
</template>
