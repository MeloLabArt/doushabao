import { beforeEach, describe, expect, it } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import App from '../App.vue'
import { WORKSPACES_STORAGE_KEY } from '../lib/workspace-storage'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('mounts renders properly', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.text()).toContain('豆沙包')
    expect(wrapper.text()).toContain('文件')
    expect(wrapper.text()).toContain('编辑')
    expect(wrapper.text()).toContain('视图')
    expect(wrapper.find('button[aria-label="设置"]').exists()).toBe(true)
  })

  it('creates a workspace when clicking 新建工作区', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        {
          path: '/w/:workspaceId',
          name: 'workspace',
          component: { template: '<div />' },
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

    const buttons = wrapper.findAll('button')
    const fileButton = buttons.find((button) => button.text() === '文件')
    expect(fileButton).toBeDefined()
    await fileButton!.trigger('click')
    await wrapper.vm.$nextTick()

    const menuItems = wrapper.findAll('[role="menuitem"]')
    const newWorkspaceButton = menuItems.find((item) => item.text() === '新建工作区')
    expect(newWorkspaceButton).toBeDefined()
    await newWorkspaceButton!.trigger('click')
    await flushPromises()
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('workspace')
    expect(router.currentRoute.value.params.workspaceId).toBeTruthy()
    expect(localStorage.getItem(WORKSPACES_STORAGE_KEY)).toBeNull()
  })
})
