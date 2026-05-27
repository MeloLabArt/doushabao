import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearDraftWorkspaces,
  closeWorkspace,
  closeWorkspaceTab,
  createDraftWorkspace,
  getWorkspace,
  isDefaultWorkspace,
  openWorkspaces,
  persistWorkspace,
} from '../lib/workspace-session'
import {
  WORKSPACES_STORAGE_KEY,
  createWorkspace,
  loadWorkspace,
  saveWorkspace,
} from '../lib/workspace-storage'

describe('workspace-session', () => {
  beforeEach(() => {
    localStorage.clear()
    clearDraftWorkspaces()
  })

  it('keeps a new workspace in memory only', () => {
    createDraftWorkspace('workspace-1')

    expect(getWorkspace('workspace-1')).toBeTruthy()
    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toBeNull()
  })

  it('tracks multiple open workspaces in tab order', () => {
    createDraftWorkspace('workspace-1')
    createDraftWorkspace('workspace-2')

    expect(openWorkspaces.value.map((workspace) => workspace.id)).toEqual([
      'workspace-1',
      'workspace-2',
    ])
  })

  it('persists a workspace after it has been changed', () => {
    const draft = createDraftWorkspace('workspace-1')
    const changed = {
      ...draft,
      title: '我的设计',
    }

    persistWorkspace(changed)

    expect(loadWorkspace('workspace-1')).toEqual({
      ...changed,
      updatedAt: expect.any(Number),
    })
    expect(getWorkspace('workspace-1')).toEqual(loadWorkspace('workspace-1'))
  })

  it('detects the default unnamed workspace', () => {
    const draft = createWorkspace('workspace-1')

    expect(isDefaultWorkspace(draft)).toBe(true)
    expect(
      isDefaultWorkspace({
        ...draft,
        title: '已修改',
      }),
    ).toBe(false)
  })

  it('closes a draft without leaving data in localStorage', () => {
    createDraftWorkspace('workspace-1')

    closeWorkspace('workspace-1')

    expect(getWorkspace('workspace-1')).toBeNull()
    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toBeNull()
  })

  it('closes a tab and switches to the neighboring workspace', () => {
    createDraftWorkspace('workspace-1')
    createDraftWorkspace('workspace-2')
    createDraftWorkspace('workspace-3')

    const nextId = closeWorkspaceTab('workspace-2')

    expect(nextId).toBe('workspace-3')
    expect(openWorkspaces.value.map((workspace) => workspace.id)).toEqual([
      'workspace-1',
      'workspace-3',
    ])
    expect(getWorkspace('workspace-2')).toBeNull()
  })

  it('closes a persisted workspace and removes it from localStorage', () => {
    const workspace = createWorkspace('workspace-1')
    saveWorkspace(workspace)

    closeWorkspace('workspace-1')

    expect(loadWorkspace('workspace-1')).toBeNull()
  })
})
