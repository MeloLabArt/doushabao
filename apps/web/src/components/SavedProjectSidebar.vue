<script setup lang="ts">
import { ImageIcon } from '@lucide/vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import {
  loadSavedProjectsFromLocalStorage,
  savedWorkspacesRevision,
  WORKSPACES_STORAGE_KEY,
} from '@/lib/workspace-storage'
import type { Workspace } from '@/types/workspace'

defineProps<{
  activeWorkspaceId: string
}>()

const emit = defineEmits<{
  select: [workspaceId: string]
}>()

const savedProjects = ref<Workspace[]>([])

function refreshFromLocalStorage(): void {
  savedProjects.value = loadSavedProjectsFromLocalStorage()
}

function onStorageEvent(event: StorageEvent): void {
  if (event.key === WORKSPACES_STORAGE_KEY || event.key === null) {
    refreshFromLocalStorage()
  }
}

watch(savedWorkspacesRevision, refreshFromLocalStorage)

onMounted(() => {
  refreshFromLocalStorage()
  window.addEventListener('storage', onStorageEvent)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorageEvent)
})

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <aside
    class="flex w-56 shrink-0 flex-col border-r border-app-border bg-app"
    aria-label="已保存项目"
  >
    <div class="border-b border-app-border px-3 py-2.5">
      <h2 class="text-xs font-medium tracking-wide text-app-muted uppercase">项目</h2>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto p-2">
      <p v-if="savedProjects.length === 0" class="px-2 py-6 text-center text-xs text-app-subtle">
        暂无已保存项目
      </p>

      <ul v-else class="space-y-1">
        <li v-for="project in savedProjects" :key="project.id">
          <button
            type="button"
            class="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors"
            :class="
              project.id === activeWorkspaceId
                ? 'bg-app-accent text-app-foreground'
                : 'text-app-muted hover:bg-app-accent hover:text-app-foreground'
            "
            @click="emit('select', project.id)"
          >
            <div
              class="mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-app-border bg-app-elevated"
            >
              <ImageIcon
                v-if="project.hasSourceImage"
                :size="14"
                :stroke-width="1.75"
                class="text-app-subtle"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm leading-snug">{{ project.title }}</p>
              <p class="mt-0.5 text-xs text-app-subtle">{{ formatUpdatedAt(project.updatedAt) }}</p>
            </div>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>
