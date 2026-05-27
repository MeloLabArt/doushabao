import type { Workspace } from '@/types/workspace'

import { ref } from 'vue'

import {
  deleteWorkspaceImage,
  loadWorkspaceImage,
  saveWorkspaceImage,
} from '@/lib/workspace-image-storage'

export const savedWorkspacesRevision = ref(0)

function notifySavedWorkspacesChanged(): void {
  savedWorkspacesRevision.value += 1
}

export const WORKSPACES_STORAGE_KEY = 'doushabao:workspaces'
export const LAST_WORKSPACE_STORAGE_KEY = 'doushabao:last-workspace-id'

export const DEFAULT_WORKSPACE_TITLE = '未命名'

type WorkspaceMap = Record<string, Workspace>

function emptyWorkspaceMap(): WorkspaceMap {
  return {}
}

function normalizeWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const value = raw as Record<string, unknown>
  if (typeof value.id !== 'string') {
    return null
  }

  const createdAt = typeof value.createdAt === 'number' ? value.createdAt : Date.now()
  const updatedAt = typeof value.updatedAt === 'number' ? value.updatedAt : createdAt

  if (typeof value.title === 'string') {
    const workspace: Workspace = {
      id: value.id,
      title: value.title,
      createdAt,
      updatedAt,
    }

    if (typeof value.sourceImage === 'string') {
      workspace.sourceImage = value.sourceImage
      workspace.hasSourceImage = true
    } else if (value.hasSourceImage === true) {
      workspace.hasSourceImage = true
    }

    return workspace
  }

  const tabs = value.tabs
  if (Array.isArray(tabs) && tabs[0] && typeof tabs[0] === 'object') {
    const firstTab = tabs[0] as Record<string, unknown>
    return {
      id: value.id,
      title: typeof firstTab.title === 'string' ? firstTab.title : DEFAULT_WORKSPACE_TITLE,
      createdAt,
      updatedAt,
    }
  }

  return null
}

function toStoredWorkspace(workspace: Workspace): Workspace {
  const { sourceImage: _sourceImage, ...record } = workspace

  return {
    ...record,
    updatedAt: Date.now(),
    ...(workspace.sourceImage || workspace.hasSourceImage ? { hasSourceImage: true } : {}),
  }
}

export function loadWorkspaces(): WorkspaceMap {
  const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY)
  if (!raw) {
    return emptyWorkspaceMap()
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const workspaces = emptyWorkspaceMap()

    for (const [id, workspace] of Object.entries(parsed)) {
      const normalized = normalizeWorkspace(workspace)
      if (normalized) {
        workspaces[id] = normalized
      }
    }

    return workspaces
  } catch {
    return emptyWorkspaceMap()
  }
}

export function loadWorkspace(id: string): Workspace | null {
  return loadWorkspaces()[id] ?? null
}

export async function hydrateWorkspaceImage(workspace: Workspace): Promise<Workspace> {
  if (workspace.sourceImage || !workspace.hasSourceImage) {
    return workspace
  }

  const sourceImage = await loadWorkspaceImage(workspace.id)
  if (!sourceImage) {
    return workspace
  }

  return {
    ...workspace,
    sourceImage,
  }
}

export async function deleteWorkspace(id: string): Promise<void> {
  const workspaces = loadWorkspaces()
  if (!(id in workspaces)) {
    return
  }

  delete workspaces[id]
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))
  await deleteWorkspaceImage(id)
  notifySavedWorkspacesChanged()

  if (loadLastWorkspaceId() === id) {
    const [nextWorkspace] = getRecentWorkspaces()
    if (nextWorkspace) {
      saveLastWorkspaceId(nextWorkspace.id)
    } else {
      localStorage.removeItem(LAST_WORKSPACE_STORAGE_KEY)
    }
  }
}

export function loadLastWorkspaceId(): string | null {
  return localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY)
}

export function saveLastWorkspaceId(id: string): void {
  localStorage.setItem(LAST_WORKSPACE_STORAGE_KEY, id)
}

export function getRecentWorkspaces(): Workspace[] {
  return loadSavedProjectsFromLocalStorage()
}

export function loadSavedProjectsFromLocalStorage(): Workspace[] {
  return Object.values(loadWorkspaces()).sort(
    (left, right) => right.updatedAt - left.updatedAt,
  )
}

export async function replaceWorkspaceSourceImage(
  workspace: Workspace,
  sourceImage: string,
): Promise<Workspace> {
  await saveWorkspaceImage(workspace.id, sourceImage)

  const nextWorkspace: Workspace = {
    ...workspace,
    sourceImage,
    hasSourceImage: true,
    updatedAt: Date.now(),
  }

  const existing = loadWorkspace(workspace.id)
  if (!existing) {
    return nextWorkspace
  }

  const workspaces = loadWorkspaces()
  workspaces[workspace.id] = toStoredWorkspace(nextWorkspace)
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))
  saveLastWorkspaceId(workspace.id)
  notifySavedWorkspacesChanged()

  return nextWorkspace
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const hasSourceImage = Boolean(workspace.sourceImage)

  if (workspace.sourceImage) {
    await saveWorkspaceImage(workspace.id, workspace.sourceImage)
  } else if (!hasSourceImage) {
    await deleteWorkspaceImage(workspace.id)
  }

  const workspaces = loadWorkspaces()
  const storedWorkspace = toStoredWorkspace({
    ...workspace,
    hasSourceImage: hasSourceImage || workspace.hasSourceImage,
  })

  workspaces[storedWorkspace.id] = storedWorkspace
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))
  saveLastWorkspaceId(storedWorkspace.id)
  notifySavedWorkspacesChanged()

  if (workspace.sourceImage) {
    await migrateLegacyWorkspaceRecord(workspace.id)
  }
}

async function migrateLegacyWorkspaceRecord(workspaceId: string): Promise<void> {
  const workspaces = loadWorkspaces()
  const current = workspaces[workspaceId]
  if (!current?.sourceImage) {
    return
  }

  await saveWorkspaceImage(workspaceId, current.sourceImage)
  workspaces[workspaceId] = toStoredWorkspace(current)
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))
  notifySavedWorkspacesChanged()
}

export function createWorkspace(id: string): Workspace {
  const now = Date.now()

  return {
    id,
    title: DEFAULT_WORKSPACE_TITLE,
    createdAt: now,
    updatedAt: now,
  }
}
