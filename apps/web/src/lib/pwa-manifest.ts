export const PWA_NAME = 'Doushabao'

export const PWA_DESCRIPTION =
  'Doushabao is an open-source web AI image editor with both Agent and Editor modes.'

/** Vite 开发服务器下 assets 中的 logo 路径 */
export const PWA_LOGO_DEV_SRC = '/src/assets/images/logo.png'

/** 不设置 theme_color / background_color，由系统与页面主题决定外观 */
export function createPwaManifest(logoSrc: string) {
  return {
    name: PWA_NAME,
    short_name: PWA_NAME,
    description: PWA_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone' as const,
    lang: 'en',
    icons: [
      {
        src: logoSrc,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoSrc,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoSrc,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
