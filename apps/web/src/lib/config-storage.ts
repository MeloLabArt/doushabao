import {
  createId,
  emptyAppSettings,
  normalizeAppSettings,
  resolveRunConfig,
  validateAndResolveDefaults,
} from '@/lib/app-settings'
import { DEFAULT_OPENROUTER_HOST } from '@/lib/model-providers'
import type { AppSettings, ModelEntry } from '@/types/app-settings'

export const CONFIG_STORAGE_KEY = 'doushabao:config'

export { DEFAULT_OPENROUTER_HOST }

type LegacyFlatConfig = {
  host?: string
  key?: string
  analysisModel?: string
  editModel?: string
  model?: string
}

type StoredPayload = Partial<AppSettings> & LegacyFlatConfig & {
  version?: number
}

function isAppSettings(parsed: StoredPayload): parsed is AppSettings {
  return Array.isArray(parsed.providers) && Array.isArray(parsed.models)
}

function migrateLegacyConfig(parsed: LegacyFlatConfig): AppSettings {
  const settings = emptyAppSettings()
  const provider = settings.providers.find((item) => item.id === 'openrouter')!
  const legacyModel = parsed.model ?? ''

  provider.host = parsed.host ?? DEFAULT_OPENROUTER_HOST
  provider.key = parsed.key ?? ''

  const analysisModelId = parsed.analysisModel ?? legacyModel
  const editModelId = parsed.editModel ?? legacyModel

  const models: ModelEntry[] = []

  if (analysisModelId.trim()) {
    const id = createId()
    models.push({
      id,
      providerId: 'openrouter',
      modelId: analysisModelId.trim(),
      label: '分析模型',
      roles: ['analysis'],
    })
    settings.defaultAnalysisModelId = id
  }

  if (editModelId.trim() && editModelId.trim() !== analysisModelId.trim()) {
    const id = createId()
    models.push({
      id,
      providerId: 'openrouter',
      modelId: editModelId.trim(),
      label: '修图模型',
      roles: ['edit'],
    })
    settings.defaultEditModelId = id
  } else if (editModelId.trim() && !settings.defaultEditModelId) {
    const existing = models[0]
    if (existing) {
      existing.roles = ['analysis', 'edit']
      settings.defaultEditModelId = existing.id
    }
  }

  if (
    editModelId.trim() &&
    analysisModelId.trim() === editModelId.trim() &&
    models.length === 1
  ) {
    models[0]!.roles = ['analysis', 'edit']
    settings.defaultEditModelId = models[0]!.id
  }

  settings.models = models

  return settings
}

export function loadAppSettings(): AppSettings {
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (!raw) {
    return emptyAppSettings()
  }

  try {
    const parsed = JSON.parse(raw) as StoredPayload

    if (isAppSettings(parsed)) {
      return normalizeAppSettings({
        providers: parsed.providers,
        models: parsed.models,
        defaultAnalysisModelId: parsed.defaultAnalysisModelId ?? '',
        defaultEditModelId: parsed.defaultEditModelId ?? '',
      })
    }

    return migrateLegacyConfig(parsed)
  } catch {
    return emptyAppSettings()
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  const validated = await validateAndResolveDefaults(settings)
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(validated))
  return validated
}

export { resolveRunConfig } from '@/lib/app-settings'
