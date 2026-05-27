import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_WORKSPACE_TITLE,
  LAST_WORKSPACE_STORAGE_KEY,
  WORKSPACES_STORAGE_KEY,
  createWorkspace,
  getRecentWorkspaces,
  loadLastWorkspaceId,
  loadWorkspace,
  loadWorkspaces,
  saveWorkspace,
} from '../lib/workspace-storage'

describe('workspace-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty map when storage is empty', () => {
    expect(loadWorkspaces()).toEqual({})
  })

  it('creates a workspace with an unnamed title', () => {
    const workspace = createWorkspace('workspace-1')

    expect(workspace.id).toBe('workspace-1')
    expect(workspace.title).toBe(DEFAULT_WORKSPACE_TITLE)
  })

  it('saves and loads a workspace', () => {
    const workspace = createWorkspace('workspace-1')
    saveWorkspace(workspace)

    const stored = loadWorkspace('workspace-1')
    expect(stored?.id).toBe('workspace-1')
    expect(stored?.title).toBe(DEFAULT_WORKSPACE_TITLE)
    expect(stored?.createdAt).toBe(workspace.createdAt)
    expect(stored?.updatedAt).toBeGreaterThanOrEqual(workspace.updatedAt)
    expect(loadLastWorkspaceId()).toBe('workspace-1')
  })

  it('tracks the most recently updated workspace', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const first = createWorkspace('workspace-1')
    saveWorkspace(first)

    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'))
    const second = createWorkspace('workspace-2')
    saveWorkspace(second)

    expect(getRecentWorkspaces().map((workspace) => workspace.id)).toEqual([
      'workspace-2',
      'workspace-1',
    ])
    expect(localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY)).toBe('workspace-2')

    vi.useRealTimers()
  })
})
