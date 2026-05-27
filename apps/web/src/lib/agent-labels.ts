import type { DeficiencyCategory, ImageType } from '@doushabao/agents'

export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  landscape: '风景',
  portrait_with_people: '带人像',
  pure_portrait: '纯人像',
}

export const DEFICIENCY_CATEGORY_LABELS: Record<DeficiencyCategory, string> = {
  color: '色彩',
  clarity: '清晰度',
  composition: '构图',
  portrait_detail: '人物细节',
  lighting: '光线',
  other: '其他',
}

export const DEFICIENCY_SEVERITY_LABELS = {
  low: '轻微',
  medium: '中等',
  high: '严重',
} as const
