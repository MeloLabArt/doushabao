import { generateImage, readImageDimensions, type Config } from '@doushabao/core'
import { getEditorSystemPrompt } from '@doushabao/agents'

import { buildEditorPrompt, buildEditorReferencePrompt } from '@/lib/build-editor-prompt'
import { loadConfig } from '@/lib/config-storage'
import { renderAnnotatedImage } from '@/lib/render-annotated-image'
import { hydrateWorkspaceImage } from '@/lib/workspace-storage'
import type { EditorMark } from '@/types/editor-mark'
import type { Workspace } from '@/types/workspace'

function validateEditorConfig(config: Config): string | null {
  if (!config.key.trim()) {
    return '请先在设置中配置 API Key'
  }

  if (!config.editModel.trim()) {
    return '请先在设置中配置修图模型'
  }

  return null
}

export async function runWorkspaceEditor(
  workspace: Workspace,
  marks: EditorMark[],
): Promise<string> {
  if (marks.length === 0) {
    throw new Error('请先在图片上圈选至少一个区域')
  }

  const config = loadConfig()
  const configError = validateEditorConfig(config)

  if (configError) {
    throw new Error(configError)
  }

  const hydrated = await hydrateWorkspaceImage(workspace)

  if (!hydrated.sourceImage) {
    throw new Error('请先上传图片')
  }

  const dimensions = await readImageDimensions(hydrated.sourceImage)
  const annotatedImage = await renderAnnotatedImage(hydrated.sourceImage, marks)
  const prompt = buildEditorPrompt(marks, dimensions)
  const referencePrompt = buildEditorReferencePrompt()

  const result = await generateImage(
    config,
    [
      { content: prompt, image: hydrated.sourceImage },
      { content: referencePrompt, image: annotatedImage },
    ],
    [{ style: '' }, { style: '' }],
    {
      mode: 'editor',
      systemPrompt: getEditorSystemPrompt(),
    },
  )

  const nextImage = result.images[0]

  if (!nextImage) {
    throw new Error('修图模型未返回图片')
  }

  return nextImage
}
