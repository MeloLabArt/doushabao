<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'WorkspaceView',
})

import ImageDropzone from '@/components/ImageDropzone.vue'
import WorkspaceImageViewport from '@/components/WorkspaceImageViewport.vue'
import { pickImageFile, readImageFileAsDataUrl } from '@/lib/read-image-file'
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

const isEditing = computed(() => {
  workspaceEditingIds.value
  return isWorkspaceEditing(props.workspaceId)
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
  const file = input.files ? pickImageFile(input.files) : null
  input.value = ''

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

defineExpose({
  commitWorkspaceChanges,
})
</script>

<template>
  <section v-if="workspaceRecord" class="app-workspace">
    <p v-if="isLoadingImage" class="flex flex-1 items-center justify-center text-sm text-app-muted">
      {{ t('workspace.loadingImage') }}
    </p>
    <div
      v-else-if="!hasImage"
      class="flex flex-1 items-center justify-center p-6"
    >
      <ImageDropzone @select="handleImageSelect" />
    </div>
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
