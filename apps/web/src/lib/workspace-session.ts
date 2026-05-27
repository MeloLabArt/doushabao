import { computed, ref } from 'vue'

import type { Workspace } from '@/types/workspace'

import {
  DEFAULT_WORKSPACE_TITLE,
  createWorkspace,
  deleteWorkspace,
  loadWorkspace,
  saveWorkspace,
} from '@/lib/workspace-storage'

const draftWorkspaces = new Map<string, Workspace>()
const openWorkspaceIds = ref<string[]>([])

export const openWorkspaces = computed(() =>
  openWorkspaceIds.value
    .map((id) => getWorkspace(id))
    .filter((workspace): workspace is Workspace => workspace !== null),
)

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

export function addOpenWorkspace(id: string): void {
  if (openWorkspaceIds.value.includes(id)) {
    return
  }

  openWorkspaceIds.value = [...openWorkspaceIds.value, id]
}

export function removeOpenWorkspace(id: string): void {
  openWorkspaceIds.value = openWorkspaceIds.value.filter((openId) => openId !== id)
}

export function persistWorkspace(workspace: Workspace): void {
  saveWorkspace(workspace)
  draftWorkspaces.delete(workspace.id)
}

export function closeWorkspace(id: string): void {
  draftWorkspaces.delete(id)
  deleteWorkspace(id)
}

export function closeWorkspaceTab(id: string): string | null {
  const index = openWorkspaceIds.value.indexOf(id)
  const nextId =
    index >= 0
      ? (openWorkspaceIds.value[index + 1] ?? openWorkspaceIds.value[index - 1] ?? null)
      : null

  removeOpenWorkspace(id)
  closeWorkspace(id)

  return nextId
}

export function clearDraftWorkspaces(): void {
  draftWorkspaces.clear()
  openWorkspaceIds.value = []
}
