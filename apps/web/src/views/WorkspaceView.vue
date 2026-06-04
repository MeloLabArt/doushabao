<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { computed, onUnmounted, ref, watch } from 'vue'
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
  getWorkspace,
  isWorkspaceEditing,
  openWorkspaces,
  persistWorkspace,
  recordWorkspaceImageHistory,
  stageWorkspaceImageChange,
  workspaceContentRevision,
  workspaceEditingIds,
} from '@/lib/workspace-session'
import {
  getWorkspaceEditMode,
  getWorkspaceEditorMarks,
  setWorkspaceEditorMarks,
  workspaceUiRevision,
} from '@/lib/workspace-ui-state'
import { hydrateWorkspaceImage } from '@/lib/workspace-storage'
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
const backgroundVideoUrl = ref<string | null>(null)
const videoCurrentTime = ref(0)

const workspaceRecord = computed(() => {
  openWorkspaces.value
  workspaceContentRevision.value

  return getWorkspace(props.workspaceId)
})

const displaySourceImage = computed(
  () => workspaceRecord.value?.sourceImage ?? hydratedSourceImage.value,
)

const hasImage = computed(
  () => Boolean(displaySourceImage.value || workspaceRecord.value?.hasSourceImage),
)

const hasVideoBackground = computed(() => Boolean(backgroundVideoUrl.value))

const hasBackground = computed(
  () => displaySourceImage.value || backgroundVideoUrl.value,
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
      // Revoke previous video URL
      if (backgroundVideoUrl.value) {
        URL.revokeObjectURL(backgroundVideoUrl.value)
      }
      backgroundVideoUrl.value = URL.createObjectURL(videoFile)
      videoCurrentTime.value = 0

      // Clear any existing source image when using video
      const record = workspaceRecord.value
      if (record) {
        const nextWorkspace: Workspace = {
          ...record,
          sourceImage: undefined,
          hasSourceImage: false,
        }
        stageWorkspaceImageChange(nextWorkspace)
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

watch(
  () => [props.workspaceId, workspaceContentRevision.value] as const,
  () => {
    void syncHydratedImage()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (backgroundVideoUrl.value) {
    URL.revokeObjectURL(backgroundVideoUrl.value)
  }
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
          <!-- Video background -->
          <video
            v-if="hasVideoBackground && backgroundVideoUrl"
            :src="backgroundVideoUrl"
            :current-time="videoCurrentTime"
            class="h-full w-full object-contain"
            :style="{
              maxWidth: (workspaceRecord.videoWidth ?? 1920) + 'px',
              maxHeight: (workspaceRecord.videoHeight ?? 1080) + 'px',
            }"
            controls
            @timeupdate="videoCurrentTime = ($event.target as HTMLVideoElement).currentTime"
          />
          <!-- Image background -->
          <WorkspaceImageViewport
          v-else-if="displaySourceImage"
          :key="displaySourceImage"
          :src="displaySourceImage"
          :alt="t('workspace.image')"
          class="h-full"
        />
        </div>
      </div>
      <VideoTimeline
        v-model:current-time="videoCurrentTime"
        :duration="10"
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
