import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import TopBar from '../components/TopBar.vue'

describe('TopBar save menu', () => {
  const defaultProps = {
    saveEnabled: false,
    sidebarVisible: true,
  }

  async function openFileMenu(wrapper: ReturnType<typeof mount>) {
    const fileButton = wrapper.findAll('button').find((button) => button.text() === '文件')
    await fileButton!.trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('disables save when saveEnabled is false', async () => {
    const wrapper = mount(TopBar, {
      props: {
        ...defaultProps,
        saveEnabled: false,
      },
    })

    await openFileMenu(wrapper)

    const saveItem = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('保存'))
    expect(saveItem).toBeDefined()
    expect(saveItem!.attributes('disabled')).toBeUndefined()
    expect(saveItem!.attributes('aria-disabled')).toBe('true')
  })

  it('enables save when saveEnabled is true', async () => {
    const wrapper = mount(TopBar, {
      props: {
        ...defaultProps,
        saveEnabled: true,
      },
    })

    await openFileMenu(wrapper)

    const saveItem = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('保存'))
    expect(saveItem).toBeDefined()
    expect(saveItem!.attributes('disabled')).toBeUndefined()
    expect(saveItem!.attributes('aria-disabled')).not.toBe('true')
  })

  it('emits save action when enabled', async () => {
    const wrapper = mount(TopBar, {
      props: {
        ...defaultProps,
        saveEnabled: true,
      },
    })

    await openFileMenu(wrapper)

    const saveItem = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('保存'))
    await saveItem!.trigger('click')

    expect(wrapper.emitted('fileAction')).toEqual([['save']])
  })

  it('emits toggleSidebar when clicking sidebar button', async () => {
    const wrapper = mount(TopBar, {
      props: defaultProps,
    })

    await wrapper.get('button[aria-label="隐藏侧边栏"]').trigger('click')

    expect(wrapper.emitted('toggleSidebar')).toEqual([[]])
  })
})
