import { describe, it, expect, beforeEach } from 'vitest'

import {
  CONFIG_STORAGE_KEY,
  loadAppSettings,
  saveAppSettings,
} from '../lib/config-storage'
import { resolveRunConfig } from '../lib/app-settings'
import { DEFAULT_GEMINI_HOST, DEFAULT_OPENROUTER_HOST } from '../lib/model-providers'
import type { AppSettings } from '../types/app-settings'

function sampleSettings(): AppSettings {
  return {
    providers: [
      {
        id: 'openrouter' as const,
        host: 'https://openrouter.ai/api/v1',
        key: 'test-key',
      },
      {
        id: 'gemini' as const,
        host: DEFAULT_GEMINI_HOST,
        key: '',
      },
      {
        id: 'openai-compatible' as const,
        host: 'https://api.openai.com/v1',
        key: '',
      },
    ],
    models: [
      {
        id: 'analysis-1',
        providerId: 'openrouter' as const,
        modelId: 'google/gemini-2.5-flash-preview',
        label: '分析',
        roles: ['analysis' as const],
      },
      {
        id: 'edit-1',
        providerId: 'openrouter' as const,
        modelId: 'google/gemini-2.5-flash-image-preview',
        label: '修图',
        roles: ['edit' as const],
      },
    ],
    defaultAnalysisModelId: 'analysis-1',
    defaultEditModelId: 'edit-1',
  }
}

describe('config-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns three fixed providers when storage is empty', () => {
    const settings = loadAppSettings()

    expect(settings.providers).toHaveLength(3)
    expect(settings.providers.map((provider) => provider.id)).toEqual([
      'openrouter',
      'gemini',
      'openai-compatible',
    ])
    expect(settings.providers[0]?.host).toBe(DEFAULT_OPENROUTER_HOST)
    expect(settings.models).toEqual([])
  })

  it('saves and loads validated settings', async () => {
    const settings = sampleSettings()

    await saveAppSettings(settings)

    expect(loadAppSettings()).toEqual(settings)
  })

  it('migrates legacy flat config to openrouter', () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({
        host: 'https://openrouter.ai/api/v1',
        key: 'test-key',
        analysisModel: 'google/gemini-2.5-flash-preview',
        editModel: 'google/gemini-2.5-flash-image-preview',
      }),
    )

    const settings = loadAppSettings()
    const openrouter = settings.providers.find((provider) => provider.id === 'openrouter')

    expect(openrouter).toMatchObject({
      host: 'https://openrouter.ai/api/v1',
      key: 'test-key',
    })
    expect(settings.models).toHaveLength(2)
    expect(settings.models.every((model) => model.providerId === 'openrouter')).toBe(true)
  })

  it('migrates legacy model field', () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({
        host: 'https://openrouter.ai/api/v1',
        key: 'test-key',
        model: 'google/gemini-2.5-flash-preview',
      }),
    )

    const settings = loadAppSettings()

    expect(settings.models).toHaveLength(1)
    expect(settings.models[0]?.modelId).toBe('google/gemini-2.5-flash-preview')
    expect(settings.models[0]?.roles).toEqual(['analysis', 'edit'])
  })

  it('normalizes custom provider ids to fixed kinds', () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({
        providers: [
          {
            id: 'custom-uuid',
            name: 'My Gemini',
            host: DEFAULT_GEMINI_HOST,
            key: 'gemini-key',
          },
        ],
        models: [
          {
            id: 'model-1',
            providerId: 'custom-uuid',
            modelId: 'gemini-2.5-flash',
            label: 'Gemini',
            roles: ['analysis', 'edit'],
          },
        ],
        defaultAnalysisModelId: 'model-1',
        defaultEditModelId: 'model-1',
      }),
    )

    const settings = loadAppSettings()

    expect(settings.providers).toHaveLength(3)
    expect(settings.providers.find((provider) => provider.id === 'gemini')?.key).toBe('gemini-key')
    expect(settings.models[0]?.providerId).toBe('gemini')
  })

  it('resolves runtime config from settings', async () => {
    const settings = sampleSettings()
    await saveAppSettings(settings)

    expect(resolveRunConfig(loadAppSettings())).toEqual({
      analysis: {
        host: 'https://openrouter.ai/api/v1',
        key: 'test-key',
        model: 'google/gemini-2.5-flash-preview',
      },
      edit: {
        host: 'https://openrouter.ai/api/v1',
        key: 'test-key',
        model: 'google/gemini-2.5-flash-image-preview',
      },
    })
  })

  it('rejects invalid settings', async () => {
    await expect(saveAppSettings(loadAppSettings())).rejects.toThrow()
  })
})
