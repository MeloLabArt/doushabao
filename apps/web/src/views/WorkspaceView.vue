<script setup lang="ts">
import { LoaderCircle, Maximize2, Minimize2, Play, Pause } from '@lucide/vue'
import { computed, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'WorkspaceView',
})

import ImageDropzone from '@/components/ImageDropzone.vue'
import VideoTimeline from '@/components/VideoTimeline.vue'
import WorkspaceImageViewport from '@/components/WorkspaceImageViewport.vue'
import { pickImageFile, readImageFileAsDataUrl, pickMediaFile } from '@/lib/read-image-file'
import {
  addOpenWorkspace,
  clearVideoObjectUrl,
  getVideoObjectUrl,
  getWorkspace,
  isWorkspaceEditing,
  markWorkspaceDirty,
  openWorkspaces,
  persistWorkspace,
  recordWorkspaceImageHistory,
  setVideoObjectUrl,
  stageWorkspaceImageChange,
  workspaceContentRevision,
  workspaceEditingIds,
  workspaceVideoRevisions,
} from '@/lib/workspace-session'
import {
  getWorkspaceEditMode,
  getWorkspaceEditorMarks,
  setWorkspaceEditorMarks,
  workspaceUiRevision,
} from '@/lib/workspace-ui-state'
import { hydrateWorkspaceImage, savedWorkspacesRevision } from '@/lib/workspace-storage'
import { loadWorkspaceVideoBlob, saveWorkspaceVideoFile } from '@/lib/workspace-video-storage'
import type { Workspace } from '@/types/workspace'
import {
  addPortraitAsset,
  addPortraitClip,
  copyPortraitClip,
  getPortraitAssets,
  getPortraitClips,
  removePortraitClip,
  splitPortraitClip,
  canUndoPortraitChange,
  restorePortraitDataFromWorkspace,
  undoPortraitChange,
  updatePortraitClip,
  recordPortraitHistory,
  workspacePortraitRevision,
  type PortraitAsset,
  type PortraitClip,
} from '@/lib/workspace-portrait'
import { ImagePlus } from '@lucide/vue'

const props = defineProps<{
  workspaceId: string
}>()

const router = useRouter()
const { t } = useI18n()
const hydratedSourceImage = ref<string | null>(null)
const isLoadingImage = ref(false)
const replaceInputRef = ref<HTMLInputElement | null>(null)

// Video workspace state
const videoPlayerRef = ref<HTMLVideoElement | null>(null)
const videoCurrentTime = ref(0)
const videoDuration = ref(0)
const isVideoPlaying = ref(false)
const isLoadingVideo = ref(false)

// Portrait state
const portraitInputRef = ref<HTMLInputElement | null>(null)
const selectedPortraitClipId = ref<string | null>(null)

// Interactive portrait transform state
const portraitCanvasRef = ref<HTMLDivElement | null>(null)
const portraitDragState = ref<{
  clipId: string
  startPointerX: number
  startPointerY: number
  startClipX: number
  startClipY: number
} | null>(null)
const portraitRotateState = ref<{
  clipId: string
  centerX: number
  centerY: number
  startAngle: number
  clipRotation: number
} | null>(null)

const portraitResizeState = ref<{
  clipId: string
  centerX: number
  centerY: number
  startDistance: number
  startScale: number
} | null>(null)

const portraitAssets = computed(() => {
  workspacePortraitRevision.value
  return getPortraitAssets(props.workspaceId)
})

const portraitClips = computed(() => {
  workspacePortraitRevision.value
  return getPortraitClips(props.workspaceId)
})

/** Portrait clips active at the current video time. */
const activePortraitClips = computed(() => {
  const t = videoCurrentTime.value
  return portraitClips.value.filter((c) => t >= c.startTime && t < c.endTime)
})

// Blob URL for <video> display — created from uploaded file or backend download.
const backgroundVideoUrl = computed(() => {
  workspaceVideoRevisions.value
  return getVideoObjectUrl(props.workspaceId) ?? null
})

const workspaceRecord = computed(() => {
  openWorkspaces.value
  workspaceContentRevision.value
  savedWorkspacesRevision.value

  return getWorkspace(props.workspaceId)
})

const displaySourceImage = computed(
  () => workspaceRecord.value?.sourceImage ?? hydratedSourceImage.value,
)

const hasImage = computed(
  () => Boolean(displaySourceImage.value || workspaceRecord.value?.hasSourceImage),
)

const hasBackground = computed(
  () => Boolean(displaySourceImage.value || backgroundVideoUrl.value),
)

const isEditing = computed(() => {
  workspaceEditingIds.value
  return isWorkspaceEditing(props.workspaceId)
})

const isVideoWorkspace = computed(() => workspaceRecord.value?.workspaceType === 'video')

const videoAspectRatio = computed(() => {
  const w = workspaceRecord.value?.videoWidth
  const h = workspaceRecord.value?.videoHeight
  if (!w || !h) return ''
  let a = w
  let b = h
  while (b) {
    ;[a, b] = [b, a % b]
  }
  const d = a
  return `${w / d}:${h / d}`
})

const editMode = computed(() => {
  workspaceUiRevision.value
  return getWorkspaceEditMode(props.workspaceId)
})

const editorMarks = computed(() => {
  workspaceUiRevision.value
  return getWorkspaceEditorMarks(props.workspaceId)
})

const annotationMode = computed(() => editMode.value === 'editor' && !isEditing.value)

function handleEditorMarksUpdate(marks: typeof editorMarks.value) {
  setWorkspaceEditorMarks(props.workspaceId, marks)
}

async function syncHydratedImage(): Promise<void> {
  const record = workspaceRecord.value

  if (!record) {
    hydratedSourceImage.value = null
    router.replace('/')
    return
  }

  addOpenWorkspace(props.workspaceId)

  if (record.sourceImage) {
    hydratedSourceImage.value = null
    return
  }

  if (!record.hasSourceImage) {
    hydratedSourceImage.value = null
    return
  }

  isLoadingImage.value = true

  try {
    const hydrated = await hydrateWorkspaceImage(record)
    hydratedSourceImage.value = hydrated.sourceImage ?? null
  } finally {
    isLoadingImage.value = false
  }
}

/**
 * If the workspace has a saved video on the backend, download it and
 * create a blob URL for <video> display.
 */
async function syncHydratedVideo(): Promise<void> {
  const record = workspaceRecord.value

  if (!record || record.workspaceType !== 'video' || backgroundVideoUrl.value) {
    return
  }

  isLoadingVideo.value = true

  try {
    const blob = await loadWorkspaceVideoBlob(props.workspaceId)
    if (blob) {
      setVideoObjectUrl(props.workspaceId, URL.createObjectURL(blob))
    }
  } catch {
    // Backend unavailable — try again later via savedWorkspacesRevision watch
  } finally {
    isLoadingVideo.value = false
  }
}

function syncHydratedPortrait(): void {
  const record = workspaceRecord.value
  if (!record) return
  restorePortraitDataFromWorkspace(record)
}

async function commitWorkspaceChanges(nextWorkspace: Workspace): Promise<void> {
  await persistWorkspace(nextWorkspace)
  hydratedSourceImage.value = nextWorkspace.sourceImage ?? null
}

function applyWorkspaceImage(dataUrl: string): void {
  const record = workspaceRecord.value

  if (!record) {
    return
  }

  const previousImage = displaySourceImage.value ?? undefined
  if (previousImage && previousImage !== dataUrl) {
    recordWorkspaceImageHistory(record.id, previousImage)
  }

  const nextWorkspace: Workspace = {
    ...record,
    sourceImage: dataUrl,
    hasSourceImage: true,
  }

  stageWorkspaceImageChange(nextWorkspace)
}

function handleImageSelect(dataUrl: string): void {
  applyWorkspaceImage(dataUrl)
}

function openReplacePicker(): void {
  replaceInputRef.value?.click()
}

async function handleReplaceInput(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  // Convert to array BEFORE clearing the input — FileList is live and
  // resetting the value clears the FileList object itself.
  const fileArray = input.files ? Array.from(input.files) : []
  input.value = ''

  if (fileArray.length === 0) {
    return
  }

  if (isVideoWorkspace.value) {
    // In video mode, accept both images and videos
    const imageFile = pickImageFile(fileArray)
    if (imageFile) {
      const dataUrl = await readImageFileAsDataUrl(imageFile)
      applyWorkspaceImage(dataUrl)
      return
    }

    const videoFile = pickMediaFile(fileArray, 'video')
    if (videoFile) {
      // Create blob URL for <video> display immediately
      setVideoObjectUrl(props.workspaceId, URL.createObjectURL(videoFile))
      videoCurrentTime.value = 0
      videoDuration.value = 0
      isVideoPlaying.value = false

      // Upload video to backend AND persist metadata sequentially
      const record = workspaceRecord.value
      if (record) {
        const nextWorkspace: Workspace = {
          ...record,
          hasSourceVideo: true,
          sourceImage: undefined,
          hasSourceImage: false,
        }
        stageWorkspaceImageChange(nextWorkspace)

        try {
          await saveWorkspaceVideoFile(props.workspaceId, videoFile)
          await persistWorkspace(nextWorkspace)
        } catch {
          // Backend unavailable — video plays from local blob URL for this session
        }
      }
      return
    }

    return
  }

  // Image workspace mode
  const file = pickImageFile(fileArray)
  if (!file) {
    return
  }

  const dataUrl = await readImageFileAsDataUrl(file)
  applyWorkspaceImage(dataUrl)
}

function handleVideoLoaded(event: Event): void {
  const video = event.target as HTMLVideoElement
  videoDuration.value = video.duration
}

function handleVideoPlay(): void {
  isVideoPlaying.value = true
}

function handleVideoPause(): void {
  isVideoPlaying.value = false
}

function handleVideoSeek(time: number): void {
  if (videoPlayerRef.value) {
    videoPlayerRef.value.currentTime = time
  }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function handleVideoPlayPause(): void {
  if (!videoPlayerRef.value) return
  if (isVideoPlaying.value) {
    videoPlayerRef.value.pause()
  } else {
    void videoPlayerRef.value.play()
  }
}

// ── Portrait handlers ────────────────────────────────────────

function handlePortraitUpload(event: Event): void {
  const input = event.target as HTMLInputElement
  const fileArray = input.files ? Array.from(input.files) : []
  input.value = ''

  for (const file of fileArray) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const name = file.name.replace(/\.[^.]+$/, '')
        const asset = addPortraitAsset(props.workspaceId, name, dataUrl)
        // Automatically create a timeline clip for the new portrait
        addPortraitClip(props.workspaceId, asset)
        markWorkspaceDirty(props.workspaceId)
      }
      reader.readAsDataURL(file)
    }
  }
}

function handlePortraitUpdate(clipId: string, updates: Partial<PortraitClip>): void {
  markWorkspaceDirty(props.workspaceId)
  updatePortraitClip(props.workspaceId, clipId, updates)
}

function handlePortraitSplit(clipId: string, splitTime: number): void {
  splitPortraitClip(props.workspaceId, clipId, splitTime)
  markWorkspaceDirty(props.workspaceId)
}

function handleAddPortraitClip(asset: PortraitAsset): void {
  addPortraitClip(props.workspaceId, asset)
  markWorkspaceDirty(props.workspaceId)
}

function handlePortraitCopy(clipId: string): void {
  copyPortraitClip(props.workspaceId, clipId)
  markWorkspaceDirty(props.workspaceId)
}

function handlePortraitDelete(clipId: string): void {
  // Deselect if deleting selected
  if (selectedPortraitClipId.value === clipId) {
    selectedPortraitClipId.value = null
  }
  removePortraitClip(props.workspaceId, clipId)
  markWorkspaceDirty(props.workspaceId)
}

function handlePortraitSelect(clipId: string | null): void {
  selectedPortraitClipId.value = clipId
}

// ── Interactive portrait drag (move) & rotate ───────────────────

function getPortraitCanvasRect(): DOMRect | null {
  // Use the fullscreenRef as the reference container for coordinate conversion
  return fullscreenRef.value?.getBoundingClientRect() ?? null
}

function startPortraitDrag(clip: PortraitClip, event: PointerEvent): void {
  if (event.button !== 0) return
  selectedPortraitClipId.value = clip.id
  const rect = getPortraitCanvasRect()
  if (!rect) return

  // Record undo state before starting the drag
  recordPortraitHistory(props.workspaceId)
  markWorkspaceDirty(props.workspaceId)

  portraitDragState.value = {
    clipId: clip.id,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startClipX: clip.x ?? 50,
    startClipY: clip.y ?? 50,
  }

  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onPortraitPointerMove(event: PointerEvent): void {
  // ── Position drag ──
  if (portraitDragState.value) {
    const state = portraitDragState.value
    const rect = getPortraitCanvasRect()
    if (!rect) return
    const dxPx = event.clientX - state.startPointerX
    const dyPx = event.clientY - state.startPointerY
    const dxPct = (dxPx / rect.width) * 100
    const dyPct = (dyPx / rect.height) * 100
    updatePortraitClip(props.workspaceId, state.clipId, {
      x: Math.max(0, Math.min(100, state.startClipX + dxPct)),
      y: Math.max(0, Math.min(100, state.startClipY + dyPct)),
    }, true /* skipHistory */)
    return
  }

  // ── Rotation drag ──
  if (portraitRotateState.value) {
    const state = portraitRotateState.value
    const dx = event.clientX - state.centerX
    const dy = event.clientY - state.centerY
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI)
    const deltaDeg = currentAngle - state.startAngle
    updatePortraitClip(props.workspaceId, state.clipId, {
      rotation: state.clipRotation + deltaDeg,
    }, true /* skipHistory */)
    return
  }

  // ── Resize drag ──
  if (portraitResizeState.value) {
    const state = portraitResizeState.value
    const dx = event.clientX - state.centerX
    const dy = event.clientY - state.centerY
    const currentDistance = Math.sqrt(dx * dx + dy * dy)
    const newScale = state.startScale * (currentDistance / state.startDistance)
    updatePortraitClip(props.workspaceId, state.clipId, {
      scale: Math.max(0.1, Math.min(5, newScale)),
    }, true /* skipHistory */)
  }
}

function onPortraitPointerUp(event: PointerEvent): void {
  if (portraitDragState.value) {
    const target = event.target as HTMLElement
    try { target.releasePointerCapture?.(event.pointerId) } catch { /* ignore */ }
    portraitDragState.value = null
  }
  if (portraitRotateState.value) {
    portraitRotateState.value = null
  }
  if (portraitResizeState.value) {
    portraitResizeState.value = null
  }
}

function startPortraitRotate(clip: PortraitClip, event: PointerEvent): void {
  if (event.button !== 0) return
  event.stopPropagation()

  // Find the portrait image element to calculate rotation center
  const layer = (event.currentTarget as HTMLElement).closest('[data-portrait-layer]') as HTMLElement
  const img = layer?.querySelector('img')
  if (!img) return

  // Record undo state before rotating
  recordPortraitHistory(props.workspaceId)
  markWorkspaceDirty(props.workspaceId)

  const rect = img.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = event.clientX - centerX
  const dy = event.clientY - centerY
  const startAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  portraitRotateState.value = {
    clipId: clip.id,
    centerX,
    centerY,
    startAngle,
    clipRotation: clip.rotation ?? 0,
  }

  event.preventDefault()
}

function startPortraitResize(clip: PortraitClip, event: PointerEvent): void {
  if (event.button !== 0) return
  event.stopPropagation()
  selectedPortraitClipId.value = clip.id

  // Find the portrait image element to calculate resize center
  const layer = (event.currentTarget as HTMLElement).closest('[data-portrait-layer]') as HTMLElement
  const img = layer?.querySelector('img')
  if (!img) return

  // Record undo state before resizing
  recordPortraitHistory(props.workspaceId)
  markWorkspaceDirty(props.workspaceId)

  const rect = img.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = event.clientX - centerX
  const dy = event.clientY - centerY
  const startDistance = Math.sqrt(dx * dx + dy * dy)

  portraitResizeState.value = {
    clipId: clip.id,
    centerX,
    centerY,
    startDistance,
    startScale: clip.scale ?? 1,
  }

  event.preventDefault()
}

// ── Fullscreen player ────────────────────────────────────────
import gsap from 'gsap'

const fullscreenRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
const fsControlsVisible = ref(true)
const fsProgressRef = ref<HTMLDivElement | null>(null)
const fsIsDragging = ref(false)
const fsSmoothTime = ref(0)
let fsSeekTween: gsap.core.Tween | null = null
let fsHideTimer: ReturnType<typeof setTimeout> | null = null

function showFsControls(): void {
  fsControlsVisible.value = true
  if (fsHideTimer) clearTimeout(fsHideTimer)
  fsHideTimer = setTimeout(() => {
    if (isFullscreen.value) fsControlsVisible.value = false
  }, 2500)
}

function toggleFullscreen(): void {
  if (!fullscreenRef.value) return
  if (!document.fullscreenElement) {
    void fullscreenRef.value.requestFullscreen()
  } else {
    void document.exitFullscreen()
  }
}

function onFullscreenChange(): void {
  isFullscreen.value = !!document.fullscreenElement
  if (isFullscreen.value) {
    showFsControls()
  } else {
    fsControlsVisible.value = true
    if (fsHideTimer) clearTimeout(fsHideTimer)
  }
}

function onFsPointerMove(): void {
  if (isFullscreen.value) showFsControls()
}

function fsClientXToProgress(clientX: number): number {
  const el = fsProgressRef.value
  if (!el || videoDuration.value <= 0) return 0
  const rect = el.getBoundingClientRect()
  return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
}

function onFsProgressPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || !videoPlayerRef.value) return
  fsIsDragging.value = true
  fsSeekTween?.kill(); fsSeekTween = null
  const ratio = fsClientXToProgress(event.clientX)
  const t = ratio * videoDuration.value
  fsSmoothTime.value = t
  videoPlayerRef.value.currentTime = t
  fsProgressRef.value?.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onFsProgressPointerMove(event: PointerEvent): void {
  if (!fsIsDragging.value || !videoPlayerRef.value) return
  const ratio = fsClientXToProgress(event.clientX)
  const t = ratio * videoDuration.value
  fsSmoothTime.value = t
  videoPlayerRef.value.currentTime = t
}

function onFsProgressPointerUp(event: PointerEvent): void {
  if (!fsIsDragging.value) return
  fsIsDragging.value = false
  fsProgressRef.value?.releasePointerCapture(event.pointerId)
  const t = fsClientXToProgress(event.clientX) * videoDuration.value
  fsSmoothTime.value = t
  if (videoPlayerRef.value) videoPlayerRef.value.currentTime = t
}

// Sync fullscreen smooth time with video time when not dragging
watch(videoCurrentTime, (t) => {
  if (!fsIsDragging.value && !fsSeekTween && isFullscreen.value) {
    fsSmoothTime.value = t
  }
})

// ── Portrait Undo (Ctrl+Z) ───────────────────────────────────

function onPortraitKeyDown(event: KeyboardEvent): void {
  // Don't intercept Ctrl+Z in text inputs
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    if (isVideoWorkspace.value && canUndoPortraitChange(props.workspaceId)) {
      event.preventDefault()
      undoPortraitChange(props.workspaceId)
    }
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('keydown', onPortraitKeyDown)
  document.addEventListener('pointermove', onPortraitPointerMove)
  document.addEventListener('pointerup', onPortraitPointerUp)
  document.addEventListener('pointercancel', onPortraitPointerUp)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('keydown', onPortraitKeyDown)
  document.removeEventListener('pointermove', onPortraitPointerMove)
  document.removeEventListener('pointerup', onPortraitPointerUp)
  document.removeEventListener('pointercancel', onPortraitPointerUp)
  if (fsHideTimer) clearTimeout(fsHideTimer)
})

watch(
  () => [props.workspaceId, workspaceContentRevision.value, savedWorkspacesRevision.value] as const,
  () => {
    void syncHydratedImage()
    void syncHydratedVideo()
    syncHydratedPortrait()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearVideoObjectUrl(props.workspaceId)
})

/**
 * Re-run hydration when the component is reactivated by KeepAlive.
 * This is necessary because closeTab() clears the video object URL and portrait
 * data in workspace-session, but the component instance is kept alive —
 * the watch with `immediate: true` already fired during setup and may not
 * re-fire if none of its reactive dependencies have changed.
 */
onActivated(() => {
  void syncHydratedImage()
  void syncHydratedVideo()
  syncHydratedPortrait()
})

defineExpose({
  commitWorkspaceChanges,
})
</script>

<template>
  <section v-if="workspaceRecord" class="app-workspace">
    <!-- Loading image (image workspaces only — video renders independently) -->
    <p v-if="isLoadingImage && workspaceRecord.workspaceType !== 'video'" class="flex flex-1 items-center justify-center text-sm text-app-muted">
      {{ t('workspace.loadingImage') }}
    </p>
    <!-- Loading video (shown until video blob loads from backend) -->
    <p v-else-if="isLoadingVideo && workspaceRecord.workspaceType === 'video'" class="flex flex-1 items-center justify-center text-sm text-app-muted">
      {{ t('workspace.loadingImage') }}
    </p>
    <!-- video workspace -->
    <div
      v-else-if="workspaceRecord.workspaceType === 'video'"
      class="flex min-h-0 flex-1 flex-col"
    >
      <div class="app-workspace-toolbar">
        <input
          ref="replaceInputRef"
          type="file"
          accept="image/*,video/*"
          class="hidden"
          @change="handleReplaceInput"
        />
        <button
          type="button"
          class="rounded-md border border-app-border bg-app-surface px-2.5 py-1 text-xs text-app-muted transition hover:bg-app-accent hover:text-app-foreground"
          @click="openReplacePicker"
        >
          {{ t('workspace.replaceBackground') }}
        </button>
        <input
          ref="portraitInputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handlePortraitUpload"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-surface px-2.5 py-1 text-xs text-app-muted transition hover:bg-app-accent hover:text-app-foreground"
          @click="portraitInputRef?.click()"
        >
          <ImagePlus :size="13" :stroke-width="1.75" />
          {{ t('portrait.addPortrait') }}
        </button>
      </div>

      <!-- Portrait assets panel -->
      <div
        v-if="portraitAssets.length > 0"
        class="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-1.5"
      >
        <div
          v-for="asset in portraitAssets"
          :key="asset.id"
          class="group relative flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1"
        >
          <img
            :src="asset.imageDataUrl"
            :alt="asset.name"
            class="size-6 rounded object-cover"
          />
          <span class="max-w-[80px] truncate text-[11px] text-white/60">{{ asset.name }}</span>
          <button
            type="button"
            class="ml-0.5 inline-flex size-4 items-center justify-center rounded text-white/30 transition hover:bg-white/10 hover:text-white/70"
            :title="t('portrait.addToTimeline')"
            @click="handleAddPortraitClip(asset)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 2v6M2 5h6" />
            </svg>
          </button>
        </div>
      </div>

      <div class="app-workspace-canvas-wrap">
        <div class="app-workspace-canvas">
          <!-- Fullscreen container for video -->
          <div
            v-if="backgroundVideoUrl"
            ref="fullscreenRef"
            class="relative flex h-full w-full items-center justify-center bg-black"
          >
            <video
              ref="videoPlayerRef"
              :src="backgroundVideoUrl"
              class="h-full w-full object-contain"
              :style="{
                maxWidth: (workspaceRecord.videoWidth ?? 1920) + 'px',
                maxHeight: (workspaceRecord.videoHeight ?? 1080) + 'px',
              }"
              @loadedmetadata="handleVideoLoaded"
              @timeupdate="videoCurrentTime = ($event.target as HTMLVideoElement).currentTime"
              @play="handleVideoPlay"
              @pause="handleVideoPause"
              @pointerdown="selectedPortraitClipId = null"
            />

            <!-- Portrait overlays on video canvas -->
            <div
              v-if="activePortraitClips.length > 0"
              ref="portraitCanvasRef"
              class="absolute inset-0 z-10"
              style="pointer-events: none"
            >
              <div
                v-for="clip in activePortraitClips"
                :key="clip.id"
                data-portrait-layer
                class="absolute"
                :class="{
                  'z-20': selectedPortraitClipId === clip.id,
                  'cursor-grab': portraitDragState?.clipId !== clip.id,
                  'cursor-grabbing': portraitDragState?.clipId === clip.id,
                }"
                :style="{
                  left: (clip.x ?? 50) + '%',
                  top: (clip.y ?? 50) + '%',
                  transform: `translate(-50%, -50%) rotate(${(clip.rotation ?? 0)}deg) scale(${clip.scale ?? 1})`,
                  pointerEvents: 'auto',
                  outline: selectedPortraitClipId === clip.id ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '2px',
                  borderRadius: '4px',
                }"
                @pointerdown="startPortraitDrag(clip, $event)"
                @pointerup="
                  selectedPortraitClipId = clip.id;
                "
              >
                <div class="relative inline-block">
                  <img
                    :src="clip.imageDataUrl"
                    :alt="clip.assetName"
                    class="pointer-events-none block max-h-[80vh] max-w-[80vw] select-none"
                    draggable="false"
                  />

                  <!-- Rotation handle (only on selected clip) -->
                  <div
                    v-if="selectedPortraitClipId === clip.id"
                    class="absolute left-1/2 z-30 flex cursor-grab flex-col items-center"
                    style="bottom: calc(100% + 6px); transform: translateX(-50%)"
                    :class="{ 'cursor-grabbing': portraitRotateState?.clipId === clip.id }"
                    @pointerdown.stop="startPortraitRotate(clip, $event)"
                  >
                    <!-- Stem line -->
                    <div class="mx-auto h-3 w-0.5 shrink-0 bg-blue-400" />
                    <!-- Handle circle -->
                    <div
                      class="size-5 shrink-0 rounded-full border-2 border-white bg-blue-500 shadow-md transition-transform hover:scale-110 active:scale-95"
                    />
                  </div>

                  <!-- Resize handle (only on selected clip — bottom-right corner) -->
                  <div
                    v-if="selectedPortraitClipId === clip.id"
                    class="absolute z-30 flex items-center justify-center"
                    style="right: -10px; bottom: -10px"
                    :class="{
                      'cursor-nwse-resize': portraitResizeState?.clipId !== clip.id,
                      'cursor-nwse-resize': portraitResizeState?.clipId === clip.id,
                    }"
                    @pointerdown.stop="startPortraitResize(clip, $event)"
                  >
                    <div
                      class="size-5 rounded-sm border-2 border-white bg-blue-500 shadow-md transition-transform hover:scale-110 active:scale-95"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Fullscreen overlay controls -->
            <div
              v-if="isFullscreen"
              class="absolute inset-0 z-50 flex flex-col justify-end bg-black/20 transition-opacity duration-300"
              :class="fsControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
              @pointermove="onFsPointerMove"
              @click="toggleFullscreen"
            >
              <!-- Bottom controls bar -->
              <div
                class="flex flex-col gap-1 px-4 pb-3 pt-6"
                style="background: linear-gradient(transparent, rgba(0,0,0,0.7))"
                @click.stop
              >
                <!-- Progress bar — YouTube-style draggable -->
                <div
                  ref="fsProgressRef"
                  class="group relative cursor-pointer py-2"
                  @pointerdown="onFsProgressPointerDown"
                  @pointermove="onFsProgressPointerMove"
                  @pointerup="onFsProgressPointerUp"
                  @pointercancel="onFsProgressPointerUp"
                >
                  <!-- Track background -->
                  <div class="h-1 rounded-full bg-white/20 group-hover:h-1.5 transition-all duration-75">
                    <!-- Progress fill — no CSS transition, JS drives it -->
                    <div
                      class="h-full rounded-full bg-white"
                      :style="{ width: (videoDuration > 0 ? (fsSmoothTime / videoDuration) * 100 : 0) + '%' }"
                    />
                  </div>
                  <!-- Scrubber handle (shows on hover/drag) -->
                  <div
                    class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform duration-75 scale-0 group-hover:scale-100"
                    :class="fsIsDragging ? 'scale-100' : ''"
                    :style="{ left: (videoDuration > 0 ? (fsSmoothTime / videoDuration) * 100 : 0) + '%' }"
                  />
                </div>

                <!-- Controls row -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      class="text-white/80 transition hover:text-white"
                      @click="handleVideoPlayPause"
                    >
                      <Play v-if="!isVideoPlaying" :size="20" :stroke-width="2" />
                      <Pause v-else :size="20" :stroke-width="2" />
                    </button>
                    <span class="text-xs tabular-nums text-white/70">
                      {{ formatTime(videoCurrentTime) }} / {{ formatTime(videoDuration) }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="text-white/60 transition hover:text-white"
                    @click="toggleFullscreen"
                  >
                    <Minimize2 :size="18" :stroke-width="1.75" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- Image background -->
          <WorkspaceImageViewport
          v-else-if="displaySourceImage"
          :key="displaySourceImage"
          :src="displaySourceImage"
          :alt="t('workspace.image')"
          class="h-full"
        />
        <!-- Blank canvas (no background loaded yet) -->
        <div
          v-else
          class="flex h-full w-full items-center justify-center"
        >
          <div
            class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-app-border bg-app-surface/50 p-10"
          >
            <p class="text-sm font-medium text-app-muted">
              {{ workspaceRecord.videoWidth }} × {{ workspaceRecord.videoHeight }}
            </p>
            <p class="mt-0.5 text-xs text-app-subtle">{{ videoAspectRatio }}</p>
            <p class="mt-2 text-xs text-app-subtle">
              {{ t('videoDimension.blankCanvas') }}
            </p>
          </div>
        </div>
        </div>

        <!-- Fullscreen toggle button (shown outside fullscreen) -->
        <button
          v-if="backgroundVideoUrl && !isFullscreen"
          type="button"
          class="absolute bottom-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-md border border-app-border bg-app/90 text-app-muted shadow-sm backdrop-blur-sm transition hover:bg-app-elevated hover:text-app-foreground"
          title="全屏播放"
          @click="toggleFullscreen"
        >
          <Maximize2 :size="16" :stroke-width="1.75" />
        </button>
      </div>
      <VideoTimeline
        :current-time="videoCurrentTime"
        :duration="videoDuration"
        :playing="isVideoPlaying"
        :portrait-clips="portraitClips"
        :selected-clip-id="selectedPortraitClipId"
        @play="handleVideoPlayPause"
        @pause="handleVideoPlayPause"
        @seek="handleVideoSeek"
        @update:portrait-clip="handlePortraitUpdate"
        @split:portrait-clip="handlePortraitSplit"
        @copy:portrait-clip="handlePortraitCopy"
        @delete:portrait-clip="handlePortraitDelete"
        @select:portrait-clip="handlePortraitSelect"
      />
    </div>
    <!-- image workspace — no image yet -->
    <div
      v-else-if="!hasImage"
      class="flex flex-1 items-center justify-center p-6"
    >
      <ImageDropzone @select="handleImageSelect" />
    </div>
    <!-- image workspace — has image -->
    <div v-else-if="displaySourceImage" class="flex min-h-0 flex-1 flex-col">
      <div class="app-workspace-toolbar">
        <input
          ref="replaceInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleReplaceInput"
        />
        <button
          type="button"
          class="rounded-md border border-app-border bg-app-surface px-2.5 py-1 text-xs text-app-muted transition hover:bg-app-accent hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isEditing"
          @click="openReplacePicker"
        >
          {{ t('workspace.replaceImage') }}
        </button>
      </div>
      <div class="app-workspace-canvas-wrap">
        <div class="app-workspace-canvas">
          <WorkspaceImageViewport
            :key="displaySourceImage"
            :src="displaySourceImage"
            :alt="t('workspace.image')"
            class="h-full"
            :annotation-mode="annotationMode"
            :marks="editorMarks"
            @update:marks="handleEditorMarksUpdate"
          />
          <div
            v-if="isEditing"
            class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-app-elevated/80 backdrop-blur-sm"
            aria-live="polite"
          >
            <LoaderCircle :size="24" :stroke-width="1.75" class="animate-spin text-app-muted" />
            <p class="text-sm font-medium text-app-foreground">{{ t('workspace.editing') }}</p>
          </div>
        </div>
      </div>
    </div>
    <!-- Fallback: hasImage is true but no image data (hydration failed) -->
    <div v-else class="flex flex-1 items-center justify-center p-6">
      <div class="flex flex-col items-center gap-3 text-center">
        <p class="text-sm text-app-muted">{{ t('workspace.replaceImage') }}</p>
        <input
          ref="replaceInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleReplaceInput"
        />
        <button
          type="button"
          class="rounded-md border border-app-border bg-app-surface px-3 py-1.5 text-xs text-app-muted transition hover:bg-app-accent hover:text-app-foreground"
          @click="openReplacePicker"
        >
          {{ t('workspace.replaceImage') }}
        </button>
      </div>
    </div>
  </section>
  <!-- Loading state: workspace record not yet available -->
  <div v-else class="flex flex-1 items-center justify-center">
    <LoaderCircle :size="24" :stroke-width="1.75" class="animate-spin text-app-muted" />
  </div>
</template>
