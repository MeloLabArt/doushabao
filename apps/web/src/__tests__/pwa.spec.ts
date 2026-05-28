import { describe, expect, it } from 'vitest'

import {
  createPwaManifest,
  PWA_DESCRIPTION,
  PWA_LOGO_DEV_SRC,
  PWA_NAME,
} from '@/lib/pwa-manifest'

describe('PWA manifest', () => {
  it('uses Doushabao branding without theme colors', () => {
    const manifest = createPwaManifest(PWA_LOGO_DEV_SRC)

    expect(PWA_NAME).toBe('Doushabao')
    expect(PWA_DESCRIPTION).toContain('open-source web AI image editor')
    expect(manifest.name).toBe('Doushabao')
    expect(manifest).not.toHaveProperty('theme_color')
    expect(manifest).not.toHaveProperty('background_color')
    expect(manifest.icons.every((icon) => icon.src === PWA_LOGO_DEV_SRC)).toBe(true)
  })
})
