import type { EditorMark } from '@/types/editor-mark'

export type ImageDimensions = {
  width: number
  height: number
}

export function buildEditorPrompt(marks: EditorMark[], dimensions: ImageDimensions): string {
  const lines = marks.map((mark, index) => {
    const description = mark.description.trim() || 'Optimize this region using visual best practices'
    return `Circle ${index + 1}: ${description}`
  })

  return [
    '[Task] Edit the first attached input original with **full-frame retouching**; output the complete frame at the same dimensions as the input.',
    'Numbered circles only mark where each edit intent applies—they are **not** circle-only edits, local crops, or cropped exports.',
    'The result must not contain any red circles or number annotations; you may balance global color and exposure while applying each point so the whole image stays natural.',
    'The input original is the plate: person identity, features, hair, clothing, composition, perspective, and background structure must match the original (except where instructions allow change).',
    'No full redraw, no face swap, no scene or season replacement.',
    '',
    'Region edit instructions (locations on annotation reference or numbered below):',
    ...lines,
    '',
    `[Dimension requirement] Output must be exactly ${dimensions.width} × ${dimensions.height} pixels (identical to the original). No crop, border, stretch, compress, or any change to aspect ratio or resolution.`,
    'If instructions conflict with fidelity, prioritize fidelity and change as little as possible.',
  ].join('\n')
}

export function buildEditorReferencePrompt(): string {
  return [
    '[Annotation reference] Same image as the previous input original, with red numbered circles overlaid for position only.',
    'Use this to locate each "circle N"; the final image must be based on the unannotated input original as a full frame with no annotation marks retained.',
  ].join('')
}
