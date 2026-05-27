<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import ImageDropzone from '@/components/ImageDropzone.vue'
import {
  addOpenWorkspace,
  getWorkspace,
  persistWorkspace,
  stageWorkspaceChanges,
} from '@/lib/workspace-session'
import { hydrateWorkspaceImage } from '@/lib/workspace-storage'
import type { Workspace } from '@/types/workspace'

const props = defineProps<{
  workspaceId: string
}>()

const router = useRouter()
const workspace = ref<Workspace | null>(null)
const isLoadingImage = ref(false)

async function syncWorkspaceFromRoute() {
  const loaded = getWorkspace(props.workspaceId)
  if (!loaded) {
    router.replace('/')
    return
  }

  addOpenWorkspace(props.workspaceId)

  if (loaded.sourceImage) {
    workspace.value = loaded
    return
  }

  if (loaded.hasSourceImage) {
    isLoadingImage.value = true
    try {
      workspace.value = await hydrateWorkspaceImage(loaded)
    } finally {
      isLoadingImage.value = false
    }
    return
  }

  workspace.value = loaded
}

async function commitWorkspaceChanges(nextWorkspace: Workspace): Promise<void> {
  await persistWorkspace(nextWorkspace)
  workspace.value = nextWorkspace
}

function handleImageSelect(dataUrl: string): void {
  if (!workspace.value) {
    return
  }

  const nextWorkspace: Workspace = {
    ...workspace.value,
    sourceImage: dataUrl,
    hasSourceImage: true,
  }

  stageWorkspaceChanges(nextWorkspace)
  workspace.value = nextWorkspace
}

watch(
  () => props.workspaceId,
  () => {
    void syncWorkspaceFromRoute()
  },
  { immediate: true },
)

defineExpose({
  commitWorkspaceChanges,
})
</script>

<template>
  <section v-if="workspace" class="flex min-h-0 flex-1 flex-col bg-app-elevated">
    <div class="flex min-h-0 flex-1 items-center justify-center p-6">
      <p v-if="isLoadingImage" class="text-sm text-app-muted">正在加载图片…</p>
      <ImageDropzone
        v-else-if="!workspace.sourceImage && !workspace.hasSourceImage"
        @select="handleImageSelect"
      />
      <img
        v-else-if="workspace.sourceImage"
        :src="workspace.sourceImage"
        alt="工作区图片"
        class="max-h-full max-w-full object-contain"
      />
    </div>
  </section>
</template>
