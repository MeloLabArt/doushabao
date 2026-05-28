import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runWorkspaceAgent } from '../lib/run-workspace-agent'
import type { Workspace } from '@/types/workspace'

vi.mock('@doushabao/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@doushabao/core')>()
  return {
    ...actual,
    runAgent: vi.fn(),
  }
})

vi.mock('../lib/config-storage', () => ({
  loadAppSettings: vi.fn(() => ({
    providers: [
      { id: 'openrouter', host: 'https://openrouter.ai/api/v1', key: 'test-key' },
      { id: 'gemini', host: 'https://generativelanguage.googleapis.com/v1beta/openai/', key: '' },
      { id: 'openai-compatible', host: 'https://api.openai.com/v1', key: '' },
    ],
    models: [
      {
        id: 'analysis-1',
        providerId: 'openrouter',
        modelId: 'analysis-model',
        label: '分析',
        roles: ['analysis'],
      },
      {
        id: 'edit-1',
        providerId: 'openrouter',
        modelId: 'edit-model',
        label: '修图',
        roles: ['edit'],
      },
    ],
    defaultAnalysisModelId: 'analysis-1',
    defaultEditModelId: 'edit-1',
  })),
}))

vi.mock('../lib/workspace-storage', () => ({
  hydrateWorkspaceImage: vi.fn(async (workspace: Workspace) => workspace),
}))

import { runAgent } from '@doushabao/core'

const mockedRunAgent = vi.mocked(runAgent)

describe('run-workspace-agent', () => {
  const workspace: Workspace = {
    id: 'workspace-1',
    title: '测试',
    createdAt: 1,
    updatedAt: 1,
    sourceImage: 'data:image/png;base64,abc',
    hasSourceImage: true,
  }

  beforeEach(() => {
    mockedRunAgent.mockReset()
  })

  it('calls runAgent with hydrated workspace image', async () => {
    mockedRunAgent.mockResolvedValue({
      analysis: {
        imageType: 'pure_portrait',
        imageTypeReason: '人物占满画面',
        deficiencies: [],
        summary: '良好',
        editPrompt: '轻微提亮肤色并增强眼部细节。',
      },
      analysisRaw: '{}',
      images: ['data:image/png;base64,result'],
      sourceDimensions: { width: 100, height: 100 },
    })

    await runWorkspaceAgent(workspace, '提高清晰度')

    expect(mockedRunAgent).toHaveBeenCalledWith(
      {
        analysis: {
          host: 'https://openrouter.ai/api/v1',
          key: 'test-key',
          model: 'analysis-model',
        },
        edit: {
          host: 'https://openrouter.ai/api/v1',
          key: 'test-key',
          model: 'edit-model',
        },
      },
      [{ content: '提高清晰度', image: 'data:image/png;base64,abc' }],
      [{ style: '' }],
      { onProgress: undefined },
    )
  })

  it('rejects when settings cannot resolve config', async () => {
    const { loadAppSettings } = await import('../lib/config-storage')
    vi.mocked(loadAppSettings).mockReturnValueOnce({
      providers: [],
      models: [],
      defaultAnalysisModelId: '',
      defaultEditModelId: '',
    })

    await expect(runWorkspaceAgent(workspace, '')).rejects.toThrow(
      '请先在设置中配置默认模型',
    )
  })
})
