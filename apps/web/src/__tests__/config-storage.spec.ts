import { describe, it, expect, beforeEach } from 'vitest'

import {
  CONFIG_STORAGE_KEY,
  DEFAULT_OPENROUTER_HOST,
  loadConfig,
  saveConfig,
} from '../lib/config-storage'

describe('config-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when storage is empty', () => {
    expect(loadConfig()).toEqual({
      host: DEFAULT_OPENROUTER_HOST,
      key: '',
      model: '',
    })
  })

  it('saves and loads validated config', async () => {
    const config = {
      host: 'https://openrouter.ai/api/v1',
      key: 'test-key',
      model: 'google/gemini-2.5-flash-preview',
    }

    await saveConfig(config)

    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toBe(JSON.stringify(config))
    expect(loadConfig()).toEqual(config)
  })

  it('rejects invalid config', async () => {
    await expect(
      saveConfig({
        host: '',
        key: 'test-key',
        model: 'google/gemini-2.5-flash-preview',
      }),
    ).rejects.toThrow('Config is invalid')
  })
})
