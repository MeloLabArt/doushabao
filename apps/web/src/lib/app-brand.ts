import logoUrl from '@/assets/images/logo.png'

export { logoUrl }

export function applyAppFavicon(href: string = logoUrl): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  link.type = 'image/png'
  link.href = href
}
