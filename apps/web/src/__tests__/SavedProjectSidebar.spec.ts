import { beforeEach, describe, expect, it, vi } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'

import SavedProjectSidebar from '../components/SavedProjectSidebar.vue'
import { clearWorkspaceImages } from '../lib/workspace-image-storage'
import { createWorkspace, saveWorkspace } from '../lib/workspace-storage'

describe('SavedProjectSidebar', () => {
  beforeEach(async () => {
    localStorage.clear()
    clearWorkspaceImages()
  })

  it('lists saved projects sorted by recent updates', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    await saveWorkspace({
      ...createWorkspace('workspace-1'),
      title: '海报 A',
    })

    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'))
    await saveWorkspace({
      ...createWorkspace('workspace-2'),
      title: '海报 B',
    })

    const wrapper = mount(SavedProjectSidebar, {
      props: {
        activeWorkspaceId: 'workspace-2',
      },
    })
    await flushPromises()

    const items = wrapper.findAll('li button')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('海报 B')
    expect(items[1]!.text()).toContain('海报 A')

    vi.useRealTimers()
  })

  it('emits select when clicking a project', async () => {
    await saveWorkspace({
      ...createWorkspace('workspace-1'),
      title: '我的项目',
    })

    const wrapper = mount(SavedProjectSidebar, {
      props: {
        activeWorkspaceId: '',
      },
    })
    await flushPromises()

    await wrapper.find('li button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['workspace-1']])
  })

  it('shows empty state when there are no saved projects', async () => {
    const wrapper = mount(SavedProjectSidebar, {
      props: {
        activeWorkspaceId: '',
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无已保存项目')
  })
})
