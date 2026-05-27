import { beforeEach, describe, expect, it } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'

import WorkspaceRightSidebar from '../components/WorkspaceRightSidebar.vue'
import { createDraftWorkspace, stageWorkspaceChanges } from '../lib/workspace-session'

describe('WorkspaceRightSidebar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows hint when no workspace is active', async () => {
    const wrapper = mount(WorkspaceRightSidebar, {
      props: {
        activeWorkspaceId: '',
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('打开或新建工作区以开始编辑')
  })

  it('shows upload hint when workspace has no image', async () => {
    createDraftWorkspace('workspace-1')

    const wrapper = mount(WorkspaceRightSidebar, {
      props: {
        activeWorkspaceId: 'workspace-1',
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('请先上传图片')
  })

  it('shows prompt form when workspace has an image', async () => {
    createDraftWorkspace('workspace-1')
    stageWorkspaceChanges({
      id: 'workspace-1',
      title: '未命名工作区',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceImage: 'data:image/png;base64,abc',
      hasSourceImage: true,
    })

    const wrapper = mount(WorkspaceRightSidebar, {
      props: {
        activeWorkspaceId: 'workspace-1',
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('编辑描述')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('button').text()).toContain('生成')
  })

  it('disables generate button when prompt is empty', async () => {
    createDraftWorkspace('workspace-1')
    stageWorkspaceChanges({
      id: 'workspace-1',
      title: '未命名工作区',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceImage: 'data:image/png;base64,abc',
      hasSourceImage: true,
    })

    const wrapper = mount(WorkspaceRightSidebar, {
      props: {
        activeWorkspaceId: 'workspace-1',
      },
    })
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
