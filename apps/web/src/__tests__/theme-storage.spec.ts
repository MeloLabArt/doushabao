import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyTheme,
  loadTheme,
  saveTheme,
} from '../lib/theme-storage'

describe('theme-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('returns default theme when storage is empty', () => {
    expect(loadTheme()).toBe(DEFAULT_THEME)
  })

  it('saves and loads theme', () => {
    saveTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(loadTheme()).toBe('dark')
  })

  it('falls back to default for invalid stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid')
    expect(loadTheme()).toBe(DEFAULT_THEME)
  })

  it('applies dark class to document root', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
