import { beforeEach, describe, expect, it, vi } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'

import WorkspaceRightSidebar from '../components/WorkspaceRightSidebar.vue'
import { createDraftWorkspace, getWorkspace, isWorkspaceEditing, stageWorkspaceChanges } from '../lib/workspace-session'
import {
  clearWorkspaceUiState,
  getWorkspaceRunStep,
  isWorkspaceRunning,
  setWorkspaceEditMode,
  setWorkspaceRunStep,
} from '../lib/workspace-ui-state'

vi.mock('../lib/run-workspace-agent', () => ({
  runWorkspaceAgent: vi.fn(),
}))

import { runWorkspaceAgent } from '../lib/run-workspace-agent'

const mockedRunWorkspaceAgent = vi.mocked(runWorkspaceAgent)

function stageWorkspaceWithImage(workspaceId: string) {
  stageWorkspaceChanges({
    id: workspaceId,
    title: '未命名工作区',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceImage: 'data:image/png;base64,abc',
    hasSourceImage: true,
  })
}

describe('WorkspaceRightSidebar tab switching', () => {
  beforeEach(() => {
    localStorage.clear()
    clearWorkspaceUiState()
    mockedRunWorkspaceAgent.mockReset()
  })

  it('keeps background edit running when switching active workspace tab', async () => {
    createDraftWorkspace('workspace-1')
    createDraftWorkspace('workspace-2')
    stageWorkspaceWithImage('workspace-1')
    stageWorkspaceWithImage('workspace-2')

    let resolveAgent: ((value: unknown) => void) | undefined
    mockedRunWorkspaceAgent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAgent = resolve
        }),
    )

    const wrapper = mount(WorkspaceRightSidebar, {
      props: {
        activeWorkspaceId: 'workspace-1',
      },
    })
    await flushPromises()

    await wrapper.find('button:not([role="tab"])').trigger('click')
    await flushPromises()

    expect(isWorkspaceRunning('workspace-1')).toBe(true)
    expect(isWorkspaceEditing('workspace-1')).toBe(true)
    expect(getWorkspaceRunStep('workspace-1')).toBe('analysis')

    await wrapper.setProps({ activeWorkspaceId: 'workspace-2' })
    await flushPromises()

    expect(isWorkspaceRunning('workspace-1')).toBe(true)
    expect(isWorkspaceEditing('workspace-1')).toBe(true)
    expect(isWorkspaceRunning('workspace-2')).toBe(false)

    resolveAgent?.({
      analysis: {
        imageType: 'landscape',
        imageTypeReason: '画面以自然山景为主',
        deficiencies: [],
        summary: '构图良好。',
        editPrompt: '提升整体饱和度。',
      },
      analysisRaw: '{}',
      images: ['data:image/png;base64,result'],
      sourceDimensions: { width: 1200, height: 900 },
    })
    await flushPromises()

    expect(isWorkspaceRunning('workspace-1')).toBe(false)
    expect(isWorkspaceEditing('workspace-1')).toBe(false)
    expect(getWorkspace('workspace-1')?.sourceImage).toBe('data:image/png;base64,result')

    await wrapper.setProps({ activeWorkspaceId: 'workspace-1' })
    await flushPromises()

    expect(wrapper.text()).toContain('分析结果')
    expect(wrapper.text()).toContain('提升整体饱和度')
  })

  it('restores in-progress status when switching back to editing workspace', async () => {
    createDraftWorkspace('workspace-1')
    createDraftWorkspace('workspace-2')
    stageWorkspaceWithImage('workspace-1')
    stageWorkspaceWithImage('workspace-2')

    setWorkspaceEditMode('workspace-1', 'editor')
    setWorkspaceRunStep('workspace-1', 'edit')

    const wrapper = mount(WorkspaceRightSidebar, {
      props: {
        activeWorkspaceId: 'workspace-2',
      },
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('正在修图')

    await wrapper.setProps({ activeWorkspaceId: 'workspace-1' })
    await flushPromises()

    expect(wrapper.text()).toContain('正在按标注修图')
  })
})
