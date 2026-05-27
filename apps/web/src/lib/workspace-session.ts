import { computed, ref } from 'vue'

import type { Workspace } from '@/types/workspace'

import {
  DEFAULT_WORKSPACE_TITLE,
  createWorkspace,
  deleteWorkspace,
  loadWorkspace,
  saveWorkspace,
} from '@/lib/workspace-storage'

export const SETTINGS_TAB_ID = 'settings'

const draftWorkspaces = new Map<string, Workspace>()
const openTabIds = ref<string[]>([])
export const dirtyWorkspaceIds = ref<Set<string>>(new Set())

export const openTabs = computed(() => openTabIds.value)

export function isSettingsTab(id: string): boolean {
  return id === SETTINGS_TAB_ID
}

export const openWorkspaces = computed(() =>
  openTabIds.value
    .filter((id) => !isSettingsTab(id))
    .map((id) => getWorkspace(id))
    .filter((workspace): workspace is Workspace => workspace !== null),
)

export function isWorkspaceDirty(id: string): boolean {
  return dirtyWorkspaceIds.value.has(id)
}

export function markWorkspaceDirty(id: string): void {
  if (dirtyWorkspaceIds.value.has(id)) {
    return
  }

  dirtyWorkspaceIds.value = new Set([...dirtyWorkspaceIds.value, id])
}

export function markWorkspaceClean(id: string): void {
  if (!dirtyWorkspaceIds.value.has(id)) {
    return
  }

  const next = new Set(dirtyWorkspaceIds.value)
  next.delete(id)
  dirtyWorkspaceIds.value = next
}

export function isDefaultWorkspace(workspace: Workspace): boolean {
  return workspace.title === DEFAULT_WORKSPACE_TITLE
}

export function createDraftWorkspace(id: string): Workspace {
  const workspace = createWorkspace(id)
  draftWorkspaces.set(id, workspace)
  addOpenWorkspace(id)
  return workspace
}

export function getWorkspace(id: string): Workspace | null {
  return draftWorkspaces.get(id) ?? loadWorkspace(id) ?? null
}

export function isDraftWorkspace(id: string): boolean {
  return draftWorkspaces.has(id)
}

export function updateDraftWorkspace(workspace: Workspace): void {
  if (draftWorkspaces.has(workspace.id)) {
    draftWorkspaces.set(workspace.id, workspace)
  }
}

export function stageWorkspaceChanges(workspace: Workspace): void {
  draftWorkspaces.set(workspace.id, workspace)
  markWorkspaceDirty(workspace.id)
  openTabIds.value = [...openTabIds.value]
}

export function addOpenWorkspace(id: string): void {
  if (openTabIds.value.includes(id)) {
    return
  }

  openTabIds.value = [...openTabIds.value, id]
}

export function addSettingsTab(): void {
  if (openTabIds.value.includes(SETTINGS_TAB_ID)) {
    return
  }

  openTabIds.value = [...openTabIds.value, SETTINGS_TAB_ID]
}

export function removeOpenTab(id: string): void {
  openTabIds.value = openTabIds.value.filter((openId) => openId !== id)
}

export function removeOpenWorkspace(id: string): void {
  removeOpenTab(id)
}

export async function persistWorkspace(workspace: Workspace): Promise<void> {
  await saveWorkspace(workspace)
  draftWorkspaces.delete(workspace.id)
  markWorkspaceClean(workspace.id)
  openTabIds.value = [...openTabIds.value]
}

export function discardWorkspace(id: string): void {
  draftWorkspaces.delete(id)
}

export function deleteSavedWorkspace(id: string): void {
  draftWorkspaces.delete(id)
  void deleteWorkspace(id)
}

function getNextTabIdAfterClose(index: number): string | null {
  if (index < 0) {
    return null
  }

  return openTabIds.value[index + 1] ?? openTabIds.value[index - 1] ?? null
}

export function closeTab(id: string): string | null {
  const index = openTabIds.value.indexOf(id)
  const nextId = getNextTabIdAfterClose(index)

  removeOpenTab(id)

  if (!isSettingsTab(id)) {
    discardWorkspace(id)
    markWorkspaceClean(id)
  }

  return nextId
}

export function closeWorkspaceTab(id: string): string | null {
  return closeTab(id)
}

export function clearDraftWorkspaces(): void {
  draftWorkspaces.clear()
  openTabIds.value = []
  dirtyWorkspaceIds.value = new Set()
}
