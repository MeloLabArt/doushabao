import { describe, expect, it } from 'vitest'

import { buildEditorPrompt } from '../lib/build-editor-prompt'
import type { EditorMark } from '../types/editor-mark'

const marks: EditorMark[] = [
  {
    id: 'mark-1',
    centerX: 0.2,
    centerY: 0.3,
    radius: 0.1,
    description: '去掉背景路人',
  },
  {
    id: 'mark-2',
    centerX: 0.7,
    centerY: 0.5,
    radius: 0.08,
    description: '',
  },
]

describe('buildEditorPrompt', () => {
  it('builds numbered region instructions', () => {
    const prompt = buildEditorPrompt(marks, { width: 1200, height: 900 })

    expect(prompt).toContain('1号圈：去掉背景路人')
    expect(prompt).toContain('2号圈：按视觉常识优化此区域')
    expect(prompt).toContain('全图修图')
    expect(prompt).toContain('宽 1200 × 高 900 像素')
  })
})
