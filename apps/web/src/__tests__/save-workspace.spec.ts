import { beforeEach, describe, expect, it } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import App from '../App.vue'
import WorkspaceView from '../views/WorkspaceView.vue'
import {
  clearDraftWorkspaces,
  getWorkspace,
  isWorkspaceDirty,
  stageWorkspaceChanges,
} from '../lib/workspace-session'
import { WORKSPACES_STORAGE_KEY } from '../lib/workspace-storage'
import { clearWorkspaceImages } from '../lib/workspace-image-storage'

describe('save workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    clearWorkspaceImages()
    clearDraftWorkspaces()
  })

  async function mountAppOnWorkspace() {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        {
          path: '/w/:workspaceId',
          name: 'workspace',
          component: WorkspaceView,
          props: true,
        },
      ],
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    const fileButton = wrapper.findAll('button').find((button) => button.text() === '文件')
    await fileButton!.trigger('click')
    await wrapper.vm.$nextTick()

    const newWorkspaceButton = wrapper
      .findAll('[role="menuitem"]')
      .find((item) => item.text().includes('新建工作区'))
    await newWorkspaceButton!.trigger('click')
    await flushPromises()
    await router.isReady()

    return { wrapper, router }
  }

  function getSaveMenuItem(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('保存'))
  }

  it('enables save after staging workspace changes', async () => {
    const { wrapper, router } = await mountAppOnWorkspace()
    const workspaceId = router.currentRoute.value.params.workspaceId as string

    stageWorkspaceChanges({
      ...getWorkspace(workspaceId)!,
      sourceImage: 'data:image/png;base64,abc',
    })

    await wrapper.vm.$nextTick()

    expect(isWorkspaceDirty(workspaceId)).toBe(true)

    const fileButton = wrapper.findAll('button').find((button) => button.text() === '文件')
    await fileButton!.trigger('click')
    await wrapper.vm.$nextTick()

    const saveItem = getSaveMenuItem(wrapper)
    expect(saveItem).toBeDefined()
    expect(saveItem!.attributes('disabled')).toBeUndefined()
  })

  it('opens save dialog and persists workspace via save button click', async () => {
    const { wrapper, router } = await mountAppOnWorkspace()
    const workspaceId = router.currentRoute.value.params.workspaceId as string

    stageWorkspaceChanges({
      ...getWorkspace(workspaceId)!,
      sourceImage: 'data:image/png;base64,abc',
    })
    await wrapper.vm.$nextTick()

    const fileButton = wrapper.findAll('button').find((button) => button.text() === '文件')
    await fileButton!.trigger('click')
    await wrapper.vm.$nextTick()

    const saveItem = getSaveMenuItem(wrapper)
    await saveItem!.trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('保存工作区')

    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement
    nameInput.value = '测试工作区'
    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.vm.$nextTick()

    const dialogSaveButton = Array.from(dialog.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === '保存',
    )
    expect(dialogSaveButton).toBeDefined()
    dialogSaveButton!.click()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toContain('测试工作区')
    expect(isWorkspaceDirty(workspaceId)).toBe(false)
  })
})
