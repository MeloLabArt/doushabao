<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteTransition from '@/components/RouteTransition.vue'
import TabBar from '@/components/TabBar.vue'
import TopBar from '@/components/TopBar.vue'
import { openNewWorkspace } from '@/lib/open-new-workspace'
import {
  addOpenWorkspace,
  closeWorkspaceTab,
  openWorkspaces,
} from '@/lib/workspace-session'

const router = useRouter()
const route = useRoute()
const transitionDirection = ref<'forward' | 'back'>('forward')

const workspaceTabs = computed(() =>
  openWorkspaces.value.map((workspace) => ({
    id: workspace.id,
    title: workspace.title,
  })),
)

const activeWorkspaceId = computed(() => {
  if (route.name === 'workspace' && typeof route.params.workspaceId === 'string') {
    return route.params.workspaceId
  }

  const tabs = workspaceTabs.value
  return tabs.length > 0 ? tabs[tabs.length - 1]!.id : ''
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

function handleFileAction(action: 'new-workspace' | 'open' | 'save') {
  if (action === 'new-workspace') {
    openNewWorkspace(router)
  }
}

function selectWorkspace(workspaceId: string) {
  if (workspaceId === activeWorkspaceId.value) {
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
  <div class="flex min-h-dvh flex-col bg-white text-neutral-900">
    <TopBar @settings-click="openSettings" @file-action="handleFileAction" />
    <TabBar
      v-if="workspaceTabs.length"
      :tabs="workspaceTabs"
      :active-tab-id="activeWorkspaceId"
      @select="selectWorkspace"
      @close="closeWorkspace"
    />
    <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RouteTransition :direction="transitionDirection" />
    </main>
  </div>
</template>
