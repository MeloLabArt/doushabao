<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Copy, Scissors, Trash2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import type { PortraitClip } from '@/lib/workspace-portrait'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    clip: PortraitClip
    duration: number
    timeScale: number
    trackWidth: number
    isSelected?: boolean
  }>(),
  {
    isSelected: false,
  },
)

const emit = defineEmits<{
  select: [clipId: string]
  update: [clipId: string, updates: Partial<PortraitClip>]
  split: [clipId: string, time: number]
  copy: [clipId: string]
  delete: [clipId: string]
}>()

const clipEl = ref<HTMLDivElement | null>(null)
const isDragging = ref<'start' | 'end' | 'move' | null>(null)
let moveStartTimeOffset = 0 // px offset from pointer to clip left edge when starting a move drag

// ── Context menu ──────────────────────────────────────────────────

const contextMenu = ref<{ x: number; y: number } | null>(null)

function openContextMenu(event: MouseEvent): void {
  event.preventDefault()
  contextMenu.value = { x: event.clientX, y: event.clientY }
  emit('select', props.clip.id)
}

function closeContextMenu(): void {
  contextMenu.value = null
}

function handleContextCopy(): void {
  emit('copy', props.clip.id)
  closeContextMenu()
}

function handleContextSplit(): void {
  emit('split', props.clip.id, 0) // time will be set by parent
  closeContextMenu()
}

function handleContextDelete(): void {
  emit('delete', props.clip.id)
  closeContextMenu()
}

// Close context menu on outside click
function onDocumentClick(): void {
  if (contextMenu.value) closeContextMenu()
}

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

// We add the listener once on first open
const contextMenuOpen = ref(false)
watch(contextMenu, (val) => {
  if (val && !contextMenuOpen.value) {
    contextMenuOpen.value = true
    document.addEventListener('click', onDocumentClick)
  } else if (!val && contextMenuOpen.value) {
    contextMenuOpen.value = false
    document.removeEventListener('click', onDocumentClick)
  }
})

// ── Positioning ───────────────────────────────────────────────────

const clipLeftPx = computed(() => {
  if (props.duration <= 0) return 0
  return (props.clip.startTime / props.duration) * props.trackWidth
})

const clipWidthPx = computed(() => {
  if (props.duration <= 0) return 0
  return ((props.clip.endTime - props.clip.startTime) / props.duration) * props.trackWidth
})

// ── Drag (resize edges + move body) ──────────────────────────────

/** Start dragging a resize handle. */
function onResizePointerDown(event: PointerEvent, handle: 'start' | 'end'): void {
  if (event.button !== 0) return
  isDragging.value = handle
  event.preventDefault()
  clipEl.value?.setPointerCapture(event.pointerId)
}

/** Start dragging the clip body to move it. */
function onBodyPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  isDragging.value = 'move'
  event.preventDefault()
  clipEl.value?.setPointerCapture(event.pointerId)

  // Save the offset from the pointer to the clip's left edge (in px)
  const parent = clipEl.value?.parentElement
  if (!parent) return
  const parentRect = parent.getBoundingClientRect()
  const clipPx = (props.clip.startTime / props.duration) * props.trackWidth
  const pointerPx = event.clientX - parentRect.left
  moveStartTimeOffset = pointerPx - clipPx
}

/** Handle pointer move during any drag. */
function onDragPointerMove(event: PointerEvent): void {
  if (!isDragging.value || !clipEl.value) return

  const parent = clipEl.value.parentElement
  if (!parent) return

  const rect = parent.getBoundingClientRect()
  const pointerPx = event.clientX - rect.left

  if (isDragging.value === 'start') {
    // Resize left edge
    const time = (pointerPx / props.trackWidth) * props.duration
    const newStart = Math.min(Math.max(time, 0), props.clip.endTime - 0.1)
    emit('update', props.clip.id, { startTime: Math.round(newStart * 100) / 100 })
  } else if (isDragging.value === 'end') {
    // Resize right edge
    const time = (pointerPx / props.trackWidth) * props.duration
    const newEnd = Math.max(Math.min(time, props.duration), props.clip.startTime + 0.1)
    emit('update', props.clip.id, { endTime: Math.round(newEnd * 100) / 100 })
  } else if (isDragging.value === 'move') {
    // Move entire clip
    const durationSec = props.clip.endTime - props.clip.startTime
    let newStart = ((pointerPx - moveStartTimeOffset) / props.trackWidth) * props.duration
    let newEnd = newStart + durationSec
    // Clamp to valid range
    if (newStart < 0) { newStart = 0; newEnd = durationSec }
    if (newEnd > props.duration) { newEnd = props.duration; newStart = props.duration - durationSec }
    emit('update', props.clip.id, {
      startTime: Math.round(newStart * 100) / 100,
      endTime: Math.round(newEnd * 100) / 100,
    })
  }
}

/** End any drag. */
function onDragPointerUp(event: PointerEvent): void {
  if (!isDragging.value) return
  isDragging.value = null
  clipEl.value?.releasePointerCapture(event.pointerId)
}

// ── Colors ─────────────────────────────────────────────────────────

// Generate a consistent color from the clip id
const clipColor = computed(() => {
  let hash = 0
  for (let i = 0; i < props.clip.id.length; i++) {
    hash = props.clip.id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return { bg: `hsla(${hue}, 60%, 35%, 0.7)`, border: `hsla(${hue}, 70%, 50%, 0.9)` }
})
</script>

<template>
  <div
    ref="clipEl"
    class="absolute top-0.5 flex items-center rounded text-[10px] text-white select-none"
    :class="[
      isSelected ? 'z-10 ring-1 ring-white/60' : 'z-0',
      isDragging === 'move' ? 'cursor-grabbing' : isDragging ? 'cursor-col-resize' : 'cursor-grab',
    ]"
    :style="{
      left: clipLeftPx + 'px',
      width: Math.max(clipWidthPx, 4) + 'px',
      height: '22px',
      background: clipColor.bg,
      borderLeft: '2px solid ' + clipColor.border,
      borderRight: '2px solid ' + clipColor.border,
    }"
    @pointerdown.self="onBodyPointerDown"
    @pointermove="onDragPointerMove"
    @pointerup="onDragPointerUp"
    @pointercancel="onDragPointerUp"
    @click.stop="emit('select', clip.id)"
    @contextmenu="openContextMenu"
  >
    <!-- Resize handle: start -->
    <div
      v-if="clipWidthPx > 20"
      class="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize"
      @pointerdown.stop.prevent="onResizePointerDown($event, 'start')"
    />

    <!-- Clip label — body area is draggable to move -->
    <span
      v-if="clipWidthPx > 30"
      class="ml-2 flex-1 truncate text-[10px] font-medium leading-none"
    >
      {{ clip.assetName }}
    </span>

    <!-- Resize handle: end -->
    <div
      v-if="clipWidthPx > 20"
      class="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize"
      @pointerdown.stop.prevent="onResizePointerDown($event, 'end')"
    />
  </div>

  <!-- Context Menu -->
  <Teleport to="body">
    <div
      v-if="contextMenu"
      class="fixed z-50 min-w-[140px] overflow-hidden rounded-lg border border-white/10 bg-[#252525] py-1 shadow-xl"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
      @contextmenu.prevent
    >
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
        @click="handleContextCopy"
      >
        <Copy :size="13" :stroke-width="1.75" />
        {{ t('portrait.copy') }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
        @click="handleContextSplit"
      >
        <Scissors :size="13" :stroke-width="1.75" />
        {{ t('portrait.split') }}
      </button>
      <div class="mx-2 my-1 border-t border-white/10" />
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition hover:bg-white/10"
        @click="handleContextDelete"
      >
        <Trash2 :size="13" :stroke-width="1.75" />
        {{ t('portrait.delete') }}
      </button>
    </div>
  </Teleport>
</template>
