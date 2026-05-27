<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteTransition from '@/components/RouteTransition.vue'
import SaveWorkspaceDialog from '@/components/SaveWorkspaceDialog.vue'
import SavedProjectSidebar from '@/components/SavedProjectSidebar.vue'
import TabBar from '@/components/TabBar.vue'
import TopBar from '@/components/TopBar.vue'
import { openNewWorkspace } from '@/lib/open-new-workspace'
import {
  addOpenWorkspace,
  closeWorkspaceTab,
  dirtyWorkspaceIds,
  getWorkspace,
  isWorkspaceDirty,
  openWorkspaces,
  persistWorkspace,
} from '@/lib/workspace-session'
import { DEFAULT_WORKSPACE_TITLE } from '@/lib/workspace-storage'
import type { Workspace } from '@/types/workspace'

const router = useRouter()
const route = useRoute()
const transitionDirection = ref<'forward' | 'back'>('forward')
const saveDialogOpen = ref(false)
const saveDialogInitialName = ref('')
const saveTargetWorkspace = ref<Workspace | null>(null)
const saveError = ref('')
const isSavingWorkspace = ref(false)
const sidebarVisible = ref(true)

const workspaceTabs = computed(() =>
  openWorkspaces.value.map((workspace) => ({
    id: workspace.id,
    title: workspace.title,
    isDirty: isWorkspaceDirty(workspace.id),
  })),
)

const activeWorkspaceId = computed(() => {
  if (route.name === 'workspace' && typeof route.params.workspaceId === 'string') {
    return route.params.workspaceId
  }

  const tabs = workspaceTabs.value
  return tabs.length > 0 ? tabs[tabs.length - 1]!.id : ''
})

const canSaveActiveWorkspace = computed(() => {
  const workspaceId = activeWorkspaceId.value
  if (!workspaceId) {
    return false
  }

  return dirtyWorkspaceIds.value.has(workspaceId)
})

router.beforeEach((to, from) => {
  if (to.name === 'workspace' && typeof to.params.workspaceId === 'string') {
    addOpenWorkspace(to.params.workspaceId)
  }

  if (to.name === 'settings') {
    transitionDirection.value = 'forward'
  } else if (from.name === 'settings') {
    transitionDirection.value = 'back'
  }
})

function openSettings() {
  router.push('/settings')
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function handleFileAction(action: 'new-workspace' | 'open' | 'save') {
  if (action === 'new-workspace') {
    openNewWorkspace(router)
    return
  }

  if (action === 'save') {
    requestSaveActiveWorkspace()
  }
}

function requestSaveActiveWorkspace(): void {
  const workspaceId = activeWorkspaceId.value
  if (!workspaceId || !dirtyWorkspaceIds.value.has(workspaceId)) {
    return
  }

  const workspace = getWorkspace(workspaceId)
  if (!workspace) {
    return
  }

  saveError.value = ''
  saveTargetWorkspace.value = { ...workspace }
  saveDialogInitialName.value =
    workspace.title === DEFAULT_WORKSPACE_TITLE ? '' : workspace.title
  saveDialogOpen.value = true
}

async function confirmSaveWorkspace(name: string): Promise<void> {
  const workspace = saveTargetWorkspace.value
  if (!workspace) {
    saveError.value = '找不到要保存的工作区，请关闭弹窗后重试'
    return
  }

  isSavingWorkspace.value = true
  saveError.value = ''

  try {
    await persistWorkspace({
      ...workspace,
      title: name,
    })
    saveDialogOpen.value = false
    saveTargetWorkspace.value = null
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    isSavingWorkspace.value = false
  }
}

function cancelSaveWorkspace(): void {
  saveDialogOpen.value = false
  saveTargetWorkspace.value = null
  saveError.value = ''
}

function onDocumentKeyDown(event: KeyboardEvent): void {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
    return
  }

  event.preventDefault()
  requestSaveActiveWorkspace()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeyDown)
})

function selectWorkspace(workspaceId: string) {
  if (workspaceId === activeWorkspaceId.value) {
    return
  }

  void router.push({
    name: 'workspace',
    params: { workspaceId },
  })
}

function openSavedProject(workspaceId: string) {
  addOpenWorkspace(workspaceId)

  if (route.name === 'workspace' && route.params.workspaceId === workspaceId) {
    return
  }

  void router.push({
    name: 'workspace',
    params: { workspaceId },
  })
}

function closeWorkspace(workspaceId: string) {
  const nextWorkspaceId = closeWorkspaceTab(workspaceId)

  if (nextWorkspaceId) {
    void router.replace({
      name: 'workspace',
      params: { workspaceId: nextWorkspaceId },
    })
    return
  }

  if (route.name === 'workspace') {
    void router.replace('/')
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-app text-app-foreground">
    <TopBar
      :save-enabled="canSaveActiveWorkspace"
      :sidebar-visible="sidebarVisible"
      @settings-click="openSettings"
      @toggle-sidebar="toggleSidebar"
      @file-action="handleFileAction"
    />
    <div class="flex min-h-0 flex-1">
      <SavedProjectSidebar
        v-show="sidebarVisible"
        :active-workspace-id="activeWorkspaceId"
        @select="openSavedProject"
      />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <TabBar
          v-if="workspaceTabs.length"
          :tabs="workspaceTabs"
          :active-tab-id="activeWorkspaceId"
          @select="selectWorkspace"
          @close="closeWorkspace"
        />
        <main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-elevated">
          <RouteTransition :direction="transitionDirection" />
        </main>
      </div>
    </div>

    <SaveWorkspaceDialog
      :open="saveDialogOpen"
      :initial-name="saveDialogInitialName"
      :error-message="saveError"
      :saving="isSavingWorkspace"
      @confirm="confirmSaveWorkspace"
      @cancel="cancelSaveWorkspace"
    />
  </div>
</template>
