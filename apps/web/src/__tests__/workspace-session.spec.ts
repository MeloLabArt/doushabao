import { beforeEach, describe, expect, it } from 'vitest'

import {
  addOpenWorkspace,
  clearDraftWorkspaces,
  closeWorkspaceTab,
  createDraftWorkspace,
  deleteSavedWorkspace,
  getWorkspace,
  isDefaultWorkspace,
  isWorkspaceDirty,
  openWorkspaces,
  persistWorkspace,
  stageWorkspaceChanges,
} from '../lib/workspace-session'
import {
  WORKSPACES_STORAGE_KEY,
  createWorkspace,
  hydrateWorkspaceImage,
  loadSavedProjectsFromLocalStorage,
  loadWorkspace,
  saveWorkspace,
} from '../lib/workspace-storage'
import { clearWorkspaceImages } from '../lib/workspace-image-storage'

describe('workspace-session', () => {
  beforeEach(() => {
    localStorage.clear()
    clearWorkspaceImages()
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

  it('persists a workspace after it has been changed', async () => {
    const draft = createDraftWorkspace('workspace-1')
    const changed = {
      ...draft,
      title: '我的设计',
    }

    await persistWorkspace(changed)

    expect(loadWorkspace('workspace-1')).toEqual({
      ...changed,
      updatedAt: expect.any(Number),
    })
    expect(getWorkspace('workspace-1')).toEqual(loadWorkspace('workspace-1'))
    expect(isWorkspaceDirty('workspace-1')).toBe(false)
  })

  it('marks staged workspace changes as dirty until saved', async () => {
    const draft = createDraftWorkspace('workspace-1')

    stageWorkspaceChanges({
      ...draft,
      sourceImage: 'data:image/png;base64,abc',
    })

    expect(isWorkspaceDirty('workspace-1')).toBe(true)
    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toBeNull()

    await persistWorkspace({
      ...getWorkspace('workspace-1')!,
      title: '海报草稿',
    })

    expect(isWorkspaceDirty('workspace-1')).toBe(false)
    expect(loadWorkspace('workspace-1')?.title).toBe('海报草稿')

    const hydrated = await hydrateWorkspaceImage(loadWorkspace('workspace-1')!)
    expect(hydrated.sourceImage).toBe('data:image/png;base64,abc')
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

    closeWorkspaceTab('workspace-1')

    expect(getWorkspace('workspace-1')).toBeNull()
    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toBeNull()
  })

  it('keeps saved projects in localStorage when closing a tab', async () => {
    const workspace = createWorkspace('workspace-1')
    await saveWorkspace({
      ...workspace,
      title: '已保存项目',
    })
    addOpenWorkspace('workspace-1')

    closeWorkspaceTab('workspace-1')

    expect(loadWorkspace('workspace-1')?.title).toBe('已保存项目')
    expect(loadSavedProjectsFromLocalStorage()).toHaveLength(1)
  })

  it('deletes a saved project from localStorage', async () => {
    const workspace = createWorkspace('workspace-1')
    await saveWorkspace(workspace)

    deleteSavedWorkspace('workspace-1')

    expect(loadWorkspace('workspace-1')).toBeNull()
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
})
