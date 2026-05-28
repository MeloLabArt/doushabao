import type { EditorMark } from '@/types/editor-mark'

export type ImageDimensions = {
  width: number
  height: number
}

export function buildEditorPrompt(marks: EditorMark[], dimensions: ImageDimensions): string {
  const lines = marks.map((mark, index) => {
    const description = mark.description.trim() || '按视觉常识优化此区域'
    return `${index + 1}号圈：${description}`
  })

  return [
    '【任务】对消息中附带的第一张输入原图做**全图修图**，输出与输入同尺寸的完整画幅成图。',
    '编号圈仅用于标明修改意图对应的位置，**不是**只修圈内区域、不是局部裁切、不是输出圈选截图。',
    '成图不得包含任何红色圆圈或编号标注；可在落实各点修改的同时协调全图色彩与曝光，使整体自然。',
    '输入原图是待修底片：人物身份、五官、发型、衣着、构图、透视、背景结构须与原图一致（指令允许的改动除外）。',
    '禁止整图重绘、禁止换脸、禁止替换场景或季节。',
    '',
    '区域修改指令（位置见标注参考图或下方编号）：',
    ...lines,
    '',
    `【尺寸硬性要求】输出图片必须为宽 ${dimensions.width} × 高 ${dimensions.height} 像素（与原图完全相同）。禁止裁切、加边、拉伸、压缩或任何导致宽高比/分辨率变化的处理。`,
    '若指令与保真冲突，以保真原图为准并尽量少改。',
  ].join('\n')
}

export function buildEditorReferencePrompt(): string {
  return [
    '【标注参考图】与上一张输入原图为同一张图，仅叠加了红色编号圆圈示意位置。',
    '请据此理解「N号圈」各指哪里；最终成图必须基于无标注的输入原图输出完整全图，且不得保留任何标注标记。',
  ].join('')
}
