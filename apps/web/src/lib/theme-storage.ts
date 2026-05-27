export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'doushabao:theme'

export const DEFAULT_THEME: Theme = 'light'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function loadTheme(): Theme {
  const raw = localStorage.getItem(THEME_STORAGE_KEY)
  return isTheme(raw) ? raw : DEFAULT_THEME
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
