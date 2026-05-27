import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import App from '../App.vue'

describe('App', () => {
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
})
