import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runWorkspaceAgent } from '../lib/run-workspace-agent'
import type { Workspace } from '@/types/workspace'

vi.mock('@doushabao/core', () => ({
  runAgent: vi.fn(),
}))

vi.mock('../lib/config-storage', () => ({
  loadConfig: vi.fn(() => ({
    host: 'https://openrouter.ai/api/v1',
    key: 'test-key',
    analysisModel: 'analysis-model',
    editModel: 'edit-model',
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
    })

    await runWorkspaceAgent(workspace, '提高清晰度')

    expect(mockedRunAgent).toHaveBeenCalledWith(
      {
        host: 'https://openrouter.ai/api/v1',
        key: 'test-key',
        analysisModel: 'analysis-model',
        editModel: 'edit-model',
      },
      [{ content: '提高清晰度', image: 'data:image/png;base64,abc' }],
      [{ style: '' }],
      { onProgress: undefined },
    )
  })

  it('rejects when config is incomplete', async () => {
    const { loadConfig } = await import('../lib/config-storage')
    vi.mocked(loadConfig).mockReturnValueOnce({
      host: 'https://openrouter.ai/api/v1',
      key: '',
      analysisModel: 'analysis-model',
      editModel: 'edit-model',
    })

    await expect(runWorkspaceAgent(workspace, '')).rejects.toThrow('请先在设置中配置 API Key')
  })

  it('rejects when analysis and edit models are the same', async () => {
    const { loadConfig } = await import('../lib/config-storage')
    vi.mocked(loadConfig).mockReturnValueOnce({
      host: 'https://openrouter.ai/api/v1',
      key: 'test-key',
      analysisModel: 'same-model',
      editModel: 'same-model',
    })

    await expect(runWorkspaceAgent(workspace, '')).rejects.toThrow('分析模型与修图模型不能相同')
  })
})
