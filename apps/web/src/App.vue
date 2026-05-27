<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteTransition from '@/components/RouteTransition.vue'
import SaveWorkspaceDialog from '@/components/SaveWorkspaceDialog.vue'
import SavedProjectSidebar from '@/components/SavedProjectSidebar.vue'
import WorkspaceRightSidebar from '@/components/WorkspaceRightSidebar.vue'
import TabBar from '@/components/TabBar.vue'
import TopBar from '@/components/TopBar.vue'
import { openNewWorkspace } from '@/lib/open-new-workspace'
import { handleAppShortcut } from '@/lib/app-shortcuts'
import {
  addOpenWorkspace,
  addSettingsTab,
  closeTab,
  dirtyWorkspaceIds,
  getWorkspace,
  isSettingsTab,
  isWorkspaceDirty,
  openTabs,
  persistWorkspace,
  SETTINGS_TAB_ID,
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
const rightSidebarVisible = ref(true)

const appTabs = computed(() =>
  openTabs.value.flatMap((id) => {
    if (isSettingsTab(id)) {
      return [{ id, title: '设置', isDirty: false }]
    }

    const workspace = getWorkspace(id)
    if (!workspace) {
      return []
    }

    return [
      {
        id,
        title: workspace.title,
        isDirty: isWorkspaceDirty(id),
      },
    ]
  }),
)

const activeTabId = computed(() => {
  if (route.name === 'settings') {
    return SETTINGS_TAB_ID
  }

  if (route.name === 'workspace' && typeof route.params.workspaceId === 'string') {
    return route.params.workspaceId
  }

  const tabs = appTabs.value
  return tabs.length > 0 ? tabs[tabs.length - 1]!.id : ''
})

const activeWorkspaceId = computed(() => {
  if (route.name === 'workspace' && typeof route.params.workspaceId === 'string') {
    return route.params.workspaceId
  }

  return ''
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
    addSettingsTab()
    transitionDirection.value = 'forward'
  } else if (from.name === 'settings') {
    transitionDirection.value = 'back'
  }
})

function openSettings() {
  addSettingsTab()

  if (route.name !== 'settings') {
    router.push('/settings')
  }
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function toggleRightSidebar() {
  rightSidebarVisible.value = !rightSidebarVisible.value
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
  if (
    handleAppShortcut(event, {
      save: requestSaveActiveWorkspace,
      toggleSidebar,
      toggleRightSidebar,
    })
  ) {
    event.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeyDown)
})

function selectTab(tabId: string) {
  if (tabId === activeTabId.value) {
    return
  }

  if (isSettingsTab(tabId)) {
    void router.push('/settings')
    return
  }

  void router.push({
    name: 'workspace',
    params: { workspaceId: tabId },
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

function navigateAfterCloseTab(nextTabId: string | null) {
  if (nextTabId) {
    if (isSettingsTab(nextTabId)) {
      void router.replace('/settings')
      return
    }

    void router.replace({
      name: 'workspace',
      params: { workspaceId: nextTabId },
    })
    return
  }

  void router.replace('/')
}

function closeAppTab(tabId: string) {
  const isClosingActiveTab =
    (route.name === 'settings' && tabId === SETTINGS_TAB_ID) ||
    (route.name === 'workspace' && route.params.workspaceId === tabId)

  const nextTabId = closeTab(tabId)

  if (!isClosingActiveTab) {
    return
  }

  navigateAfterCloseTab(nextTabId)
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-app text-app-foreground">
    <TopBar
      :save-enabled="canSaveActiveWorkspace"
      :sidebar-visible="sidebarVisible"
      :right-sidebar-visible="rightSidebarVisible"
      @settings-click="openSettings"
      @toggle-sidebar="toggleSidebar"
      @toggle-right-sidebar="toggleRightSidebar"
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
          v-if="appTabs.length"
          :tabs="appTabs"
          :active-tab-id="activeTabId"
          @select="selectTab"
          @close="closeAppTab"
        />
        <main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-elevated">
          <RouteTransition :direction="transitionDirection" />
        </main>
      </div>
      <WorkspaceRightSidebar
        v-show="rightSidebarVisible"
        :active-workspace-id="activeWorkspaceId"
      />
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
