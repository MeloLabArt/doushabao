import type { Workspace } from '@/types/workspace'

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
    return {
      id: value.id,
      title: value.title,
      createdAt,
      updatedAt,
    }
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

export function deleteWorkspace(id: string): void {
  const workspaces = loadWorkspaces()
  if (!(id in workspaces)) {
    return
  }

  delete workspaces[id]
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))

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
  return Object.values(loadWorkspaces()).sort(
    (left, right) => right.updatedAt - left.updatedAt,
  )
}

export function saveWorkspace(workspace: Workspace): void {
  const workspaces = loadWorkspaces()
  const nextWorkspace: Workspace = {
    ...workspace,
    updatedAt: Date.now(),
  }
  workspaces[nextWorkspace.id] = nextWorkspace
  localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces))
  saveLastWorkspaceId(nextWorkspace.id)
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
