import { loadBackendSettings, saveBackendSettings } from '@/lib/api-client'

export type Theme = 'light' | 'dark'

export const DEFAULT_THEME: Theme = 'light'

let currentTheme: Theme = DEFAULT_THEME

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function loadTheme(): Theme {
  return currentTheme
}

export function saveTheme(theme: Theme): void {
  currentTheme = theme
  saveBackendSettings({ theme }).catch(() => {
    // Backend unavailable
  })
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export async function syncThemeFromBackend(): Promise<Theme> {
  try {
    const settings = await loadBackendSettings()
    if (isTheme(settings.theme)) {
      currentTheme = settings.theme as Theme
      applyTheme(currentTheme)
      return currentTheme
    }
  } catch {
    // Backend unavailable
  }
  return currentTheme
}
