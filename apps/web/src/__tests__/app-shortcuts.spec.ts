import { describe, expect, it, vi } from 'vitest'

import { handleAppShortcut } from '../lib/app-shortcuts'

describe('handleAppShortcut', () => {
  function createActions() {
    return {
      save: vi.fn(),
      toggleSidebar: vi.fn(),
      toggleRightSidebar: vi.fn(),
    }
  }

  it('calls save on Cmd/Ctrl+S', () => {
    const actions = createActions()

    expect(
      handleAppShortcut({ key: 's', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }, actions),
    ).toBe(true)
    expect(actions.save).toHaveBeenCalledOnce()
  })

  it('calls toggleSidebar on Cmd/Ctrl+B', () => {
    const actions = createActions()

    expect(
      handleAppShortcut({ key: 'b', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false }, actions),
    ).toBe(true)
    expect(actions.toggleSidebar).toHaveBeenCalledOnce()
  })

  it('calls toggleRightSidebar on Cmd/Ctrl+Shift+B', () => {
    const actions = createActions()

    expect(
      handleAppShortcut(
        { key: 'b', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false },
        actions,
      ),
    ).toBe(true)
    expect(actions.toggleRightSidebar).toHaveBeenCalledOnce()
  })

  it('ignores shortcuts without modifier keys', () => {
    const actions = createActions()

    expect(
      handleAppShortcut({ key: 'b', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }, actions),
    ).toBe(false)
    expect(actions.toggleSidebar).not.toHaveBeenCalled()
  })
})
