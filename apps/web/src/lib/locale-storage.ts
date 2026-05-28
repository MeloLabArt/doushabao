export type AppLocale = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'

export const LOCALE_STORAGE_KEY = 'doushabao:locale'

export const FALLBACK_LOCALE: AppLocale = 'en'

export const SUPPORTED_LOCALES: AppLocale[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko']

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as string[]).includes(value)
}

function detectBrowserLocale(): AppLocale {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]

  for (const language of languages) {
    const normalized = language.toLowerCase()

    if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.startsWith('zh-mo')) {
      return 'zh-TW'
    }

    if (normalized.startsWith('zh')) {
      return 'zh-CN'
    }

    if (normalized.startsWith('ja')) {
      return 'ja'
    }

    if (normalized.startsWith('ko')) {
      return 'ko'
    }

    if (normalized.startsWith('en')) {
      return 'en'
    }
  }

  return 'zh-CN'
}

export function loadLocale(): AppLocale {
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
  return isAppLocale(raw) ? raw : detectBrowserLocale()
}

export function saveLocale(locale: AppLocale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
