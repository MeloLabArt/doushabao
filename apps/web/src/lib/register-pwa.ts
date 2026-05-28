import { registerSW } from 'virtual:pwa-register'

export function registerPwa(): void {
  if (import.meta.env.MODE === 'test') return

  registerSW({ immediate: true })
}
