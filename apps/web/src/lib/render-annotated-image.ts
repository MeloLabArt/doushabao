import type { EditorMark } from '@/types/editor-mark'

import { translate } from '@/i18n'

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(translate('errors.loadImageFailed')))
    image.src = source
  })
}

export async function renderAnnotatedImage(
  sourceImage: string,
  marks: EditorMark[],
): Promise<string> {
  const image = await loadImage(sourceImage)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error(translate('errors.createCanvasFailed'))
  }

  context.drawImage(image, 0, 0)

  const base = Math.min(canvas.width, canvas.height)
  const strokeWidth = Math.max(2, base * 0.004)
  const fontSize = Math.max(14, base * 0.035)
  const labelRadius = fontSize * 0.75

  marks.forEach((mark, index) => {
    const centerX = mark.centerX * canvas.width
    const centerY = mark.centerY * canvas.height
    const radius = mark.radius * base
    const label = String(index + 1)

    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.strokeStyle = '#FF3B30'
    context.lineWidth = strokeWidth
    context.stroke()

    const labelX = centerX + radius * 0.65
    const labelY = centerY - radius * 0.65

    context.beginPath()
    context.arc(labelX, labelY, labelRadius, 0, Math.PI * 2)
    context.fillStyle = '#FF3B30'
    context.fill()

    context.fillStyle = '#FFFFFF'
    context.font = `bold ${fontSize}px system-ui, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, labelX, labelY)
  })

  return canvas.toDataURL('image/png')
}
