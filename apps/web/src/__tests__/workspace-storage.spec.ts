import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_WORKSPACE_TITLE,
  LAST_WORKSPACE_STORAGE_KEY,
  WORKSPACES_STORAGE_KEY,
  createWorkspace,
  getRecentWorkspaces,
  hydrateWorkspaceImage,
  loadLastWorkspaceId,
  loadWorkspace,
  loadWorkspaces,
  replaceWorkspaceSourceImage,
  saveWorkspace,
} from '../lib/workspace-storage'
import { clearWorkspaceImages, loadWorkspaceImage } from '../lib/workspace-image-storage'

describe('workspace-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearWorkspaceImages()
  })

  it('returns empty map when storage is empty', () => {
    expect(loadWorkspaces()).toEqual({})
  })

  it('creates a workspace with an unnamed title', () => {
    const workspace = createWorkspace('workspace-1')

    expect(workspace.id).toBe('workspace-1')
    expect(workspace.title).toBe(DEFAULT_WORKSPACE_TITLE)
  })

  it('saves and loads a workspace', async () => {
    const workspace = createWorkspace('workspace-1')
    await saveWorkspace(workspace)

    const stored = loadWorkspace('workspace-1')
    expect(stored?.id).toBe('workspace-1')
    expect(stored?.title).toBe(DEFAULT_WORKSPACE_TITLE)
    expect(stored?.createdAt).toBe(workspace.createdAt)
    expect(stored?.updatedAt).toBeGreaterThanOrEqual(workspace.updatedAt)
    expect(loadLastWorkspaceId()).toBe('workspace-1')
  })

  it('stores large source images outside localStorage', async () => {
    const workspace = {
      ...createWorkspace('workspace-1'),
      title: '大图工作区',
      sourceImage: `data:image/png;base64,${'a'.repeat(1024 * 512)}`,
    }

    await saveWorkspace(workspace)

    const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(raw!.length).toBeLessThan(1024)
    expect(loadWorkspace('workspace-1')).toMatchObject({
      id: 'workspace-1',
      title: '大图工作区',
      hasSourceImage: true,
    })
    expect(loadWorkspace('workspace-1')?.sourceImage).toBeUndefined()

    const hydrated = await hydrateWorkspaceImage(loadWorkspace('workspace-1')!)
    expect(hydrated.sourceImage).toBe(workspace.sourceImage)
  })

  it('tracks the most recently updated workspace', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const first = createWorkspace('workspace-1')
    await saveWorkspace(first)

    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'))
    const second = createWorkspace('workspace-2')
    await saveWorkspace(second)

    expect(getRecentWorkspaces().map((workspace) => workspace.id)).toEqual([
      'workspace-2',
      'workspace-1',
    ])
    expect(localStorage.getItem(LAST_WORKSPACE_STORAGE_KEY)).toBe('workspace-2')

    vi.useRealTimers()
  })

  it('replaces stored source image in IndexedDB', async () => {
    const workspace = {
      ...createWorkspace('workspace-1'),
      title: '测试项目',
      sourceImage: 'data:image/png;base64,original',
      hasSourceImage: true,
    }

    await saveWorkspace(workspace)

    const replaced = await replaceWorkspaceSourceImage(workspace, 'data:image/png;base64,edited')

    expect(replaced.sourceImage).toBe('data:image/png;base64,edited')
    expect(await loadWorkspaceImage('workspace-1')).toBe('data:image/png;base64,edited')
    expect(await hydrateWorkspaceImage(loadWorkspace('workspace-1')!)).toMatchObject({
      sourceImage: 'data:image/png;base64,edited',
    })
  })
})
