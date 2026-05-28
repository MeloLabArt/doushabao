import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDraftWorkspace, getWorkspace, stageWorkspaceChanges } from '../lib/workspace-session'
import { runWorkspaceEditor } from '../lib/run-workspace-editor'

vi.mock('@doushabao/core', () => ({
  generateImage: vi.fn(),
  readImageDimensions: vi.fn(async () => ({ width: 1200, height: 900 })),
}))

vi.mock('../lib/config-storage', () => ({
  loadConfig: vi.fn(() => ({
    key: 'test-key',
    editModel: 'edit-model',
    analysisModel: 'analysis-model',
  })),
}))

vi.mock('../lib/render-annotated-image', () => ({
  renderAnnotatedImage: vi.fn(async () => 'data:image/png;base64,annotated'),
}))

import { generateImage } from '@doushabao/core'

const mockedGenerateImage = vi.mocked(generateImage)

function stageWorkspaceWithImage(workspaceId: string) {
  stageWorkspaceChanges({
    id: workspaceId,
    title: '未命名工作区',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceImage: 'data:image/png;base64,abc',
    hasSourceImage: true,
  })
}

describe('runWorkspaceEditor', () => {
  beforeEach(() => {
    mockedGenerateImage.mockReset()
  })

  it('requires at least one mark', async () => {
    createDraftWorkspace('workspace-1')
    stageWorkspaceWithImage('workspace-1')

    await expect(runWorkspaceEditor(getWorkspace('workspace-1')!, [])).rejects.toThrow(
      '请先在图片上圈选至少一个区域',
    )
  })

  it('calls generateImage with original image, reference annotation, and full-frame prompt', async () => {
    createDraftWorkspace('workspace-1')
    stageWorkspaceWithImage('workspace-1')

    mockedGenerateImage.mockResolvedValue({
      images: ['data:image/png;base64,result'],
    })

    const result = await runWorkspaceEditor(getWorkspace('workspace-1')!, [
      {
        id: 'mark-1',
        centerX: 0.5,
        centerY: 0.5,
        radius: 0.1,
        description: '去掉杂物',
      },
    ])

    expect(result).toBe('data:image/png;base64,result')
    expect(mockedGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({ editModel: 'edit-model' }),
      [
        expect.objectContaining({
          image: 'data:image/png;base64,abc',
          content: expect.stringContaining('1号圈：去掉杂物'),
        }),
        expect.objectContaining({
          image: 'data:image/png;base64,annotated',
          content: expect.stringContaining('标注参考图'),
        }),
      ],
      [{ style: '' }, { style: '' }],
      expect.objectContaining({ mode: 'editor' }),
    )
  })
})
