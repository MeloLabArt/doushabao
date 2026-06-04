<script setup lang="ts">
import { LoaderCircle, Maximize2, Minimize2, Play, Pause } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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

// ── Fullscreen player ────────────────────────────────────────

const fullscreenRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
const fsControlsVisible = ref(true)
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

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (fsHideTimer) clearTimeout(fsHideTimer)
})

watch(
  () => [props.workspaceId, workspaceContentRevision.value, savedWorkspacesRevision.value] as const,
  () => {
    void syncHydratedImage()
    void syncHydratedVideo()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearVideoObjectUrl(props.workspaceId)
})

defineExpose({
  commitWorkspaceChanges,
})
</script>

<template>
  <section v-if="workspaceRecord" class="app-workspace">
    <p v-if="isLoadingImage" class="flex flex-1 items-center justify-center text-sm text-app-muted">
      {{ t('workspace.loadingImage') }}
    </p>
    <!-- video workspace — blank canvas -->
    <div
      v-else-if="workspaceRecord.workspaceType === 'video' && !hasBackground"
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
          {{ t('workspace.replaceImage') }}
        </button>
      </div>
      <div class="flex flex-1 items-center justify-center p-6">
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

    <!-- video workspace — has background -->
    <div
      v-else-if="workspaceRecord.workspaceType === 'video' && hasBackground"
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
          class="rounded-md border border-app-border bg-app-surface px-2.5 py-1 text-xs text-app-muted transition hover:bg-app-accent hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50"
          @click="openReplacePicker"
        >
          {{ t('workspace.replaceImage') }}
        </button>
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
            />

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
                <!-- Progress bar -->
                <div
                  class="group relative h-1.5 cursor-pointer rounded-full bg-white/20 transition-all hover:h-2"
                  @click="handleVideoSeek(($event.offsetX / ($event.target as HTMLElement).clientWidth) * videoDuration)"
                >
                  <div
                    class="h-full rounded-full bg-white transition-all"
                    :style="{ width: (videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0) + '%' }"
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
        @play="handleVideoPlayPause"
        @pause="handleVideoPlayPause"
        @seek="handleVideoSeek"
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
  </section>
</template>
