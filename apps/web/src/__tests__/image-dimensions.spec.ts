import { describe, expect, it } from 'vitest'

import { resolveAspectRatio } from '@doushabao/core'

describe('image-dimensions', () => {
  it('resolves closest supported aspect ratio', () => {
    expect(resolveAspectRatio({ width: 1920, height: 1080 })).toBe('16:9')
    expect(resolveAspectRatio({ width: 1024, height: 1024 })).toBe('1:1')
    expect(resolveAspectRatio({ width: 1080, height: 1920 })).toBe('9:16')
  })
})
