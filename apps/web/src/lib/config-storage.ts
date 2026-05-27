import { InitConfig, type Config } from '@doushabao/core'

export const CONFIG_STORAGE_KEY = 'doushabao:config'

export const DEFAULT_OPENROUTER_HOST = 'https://openrouter.ai/api/v1'

const emptyConfig = (): Config => ({
  host: DEFAULT_OPENROUTER_HOST,
  key: '',
  model: '',
})

export function loadConfig(): Config {
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (!raw) {
    return emptyConfig()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Config>
    return {
      host: parsed.host ?? DEFAULT_OPENROUTER_HOST,
      key: parsed.key ?? '',
      model: parsed.model ?? '',
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
