import { generateImage, readImageDimensions } from '@doushabao/core'
import { getEditorSystemPrompt } from '@doushabao/agents'

import { validateRunConfig } from '@/lib/app-settings'
import { buildEditorPrompt, buildEditorReferencePrompt } from '@/lib/build-editor-prompt'
import { loadAppSettings } from '@/lib/config-storage'
import { renderAnnotatedImage } from '@/lib/render-annotated-image'
import { hydrateWorkspaceImage } from '@/lib/workspace-storage'
import type { EditorMark } from '@/types/editor-mark'
import type { ModelSelection } from '@/types/app-settings'
import type { Workspace } from '@/types/workspace'

export async function runWorkspaceEditor(
  workspace: Workspace,
  marks: EditorMark[],
  modelSelection?: ModelSelection,
): Promise<string> {
  if (marks.length === 0) {
    throw new Error('请先在图片上圈选至少一个区域')
  }

  const settings = loadAppSettings()
  const config = await validateRunConfig(settings, modelSelection)

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
