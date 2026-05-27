<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  addOpenWorkspace,
  getWorkspace,
  isDraftWorkspace,
  persistWorkspace,
  updateDraftWorkspace,
} from '@/lib/workspace-session'
import { saveWorkspace } from '@/lib/workspace-storage'
import type { Workspace } from '@/types/workspace'

const props = defineProps<{
  workspaceId: string
}>()

const router = useRouter()
const workspace = ref<Workspace | null>(null)

function storeWorkspace(nextWorkspace: Workspace): void {
  workspace.value = nextWorkspace

  if (isDraftWorkspace(nextWorkspace.id)) {
    updateDraftWorkspace(nextWorkspace)
    return
  }

  saveWorkspace(nextWorkspace)
}

function syncWorkspaceFromRoute() {
  const loaded = getWorkspace(props.workspaceId)
  if (!loaded) {
    router.replace('/')
    return
  }

  workspace.value = loaded
  addOpenWorkspace(props.workspaceId)
}

function commitWorkspaceChanges(nextWorkspace: Workspace): void {
  persistWorkspace(nextWorkspace)
  workspace.value = nextWorkspace
}

watch(
  () => props.workspaceId,
  () => {
    syncWorkspaceFromRoute()
  },
  { immediate: true },
)

defineExpose({
  commitWorkspaceChanges,
})
</script>

<template>
  <section v-if="workspace" class="flex min-h-0 flex-1 flex-col bg-app-elevated">
    <div class="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-app-muted">
      {{ workspace.title }}
    </div>
  </section>
</template>
