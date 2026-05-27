import { InitConfig, type Config } from '@doushabao/core'

export const CONFIG_STORAGE_KEY = 'doushabao:config'

export const DEFAULT_OPENROUTER_HOST = 'https://openrouter.ai/api/v1'

const emptyConfig = (): Config => ({
  host: DEFAULT_OPENROUTER_HOST,
  key: '',
  analysisModel: '',
  editModel: '',
})

type StoredConfig = Partial<Config> & {
  model?: string
}

export function loadConfig(): Config {
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (!raw) {
    return emptyConfig()
  }

  try {
    const parsed = JSON.parse(raw) as StoredConfig
    const legacyModel = parsed.model ?? ''

    return {
      host: parsed.host ?? DEFAULT_OPENROUTER_HOST,
      key: parsed.key ?? '',
      analysisModel: parsed.analysisModel ?? legacyModel,
      editModel: parsed.editModel ?? legacyModel,
    }
  } catch {
    return emptyConfig()
  }
}

export async function saveConfig(config: Config): Promise<Config> {
  const validated = await InitConfig(config)
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(validated))
  return validated
}
