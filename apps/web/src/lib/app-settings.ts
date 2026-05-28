import { InitConfig, type Config } from '@doushabao/core'

import {
  createDefaultProviders,
  getProviderDefinition,
  getProviderLabel,
  inferProviderKind,
  isProviderKind,
} from '@/lib/model-providers'
import type { AppSettings, ModelEntry, ModelProvider, ModelRole, ModelSelection, ProviderKind } from '@/types/app-settings'

export function createId(): string {
  return crypto.randomUUID()
}

export function emptyAppSettings(): AppSettings {
  return {
    providers: createDefaultProviders(),
    models: [],
    defaultAnalysisModelId: '',
    defaultEditModelId: '',
  }
}

export function normalizeAppSettings(settings: AppSettings): AppSettings {
  const normalized = emptyAppSettings()

  for (const stored of settings.providers) {
    const kind = inferProviderKind(stored)
    const target = normalized.providers.find((provider) => provider.id === kind)

    if (!target) {
      continue
    }

    if (stored.key.trim()) {
      target.key = stored.key.trim()
    }

    if (kind === 'openai-compatible' && stored.host?.trim()) {
      target.host = stored.host.trim()
    }
  }

  const providerIdMap = new Map<string, ProviderKind>()

  for (const stored of settings.providers) {
    providerIdMap.set(stored.id, inferProviderKind(stored))
  }

  const models: ModelEntry[] = settings.models
    .map((model) => {
      const mappedKind = providerIdMap.get(model.providerId)
      const providerId: ProviderKind =
        mappedKind ?? (isProviderKind(model.providerId) ? model.providerId : 'openrouter')

      return {
        ...model,
        providerId,
      }
    })
    .filter((model) => isProviderKind(model.providerId))

  return {
    providers: normalized.providers,
    models,
    defaultAnalysisModelId: settings.defaultAnalysisModelId ?? '',
    defaultEditModelId: settings.defaultEditModelId ?? '',
  }
}

export function getProvider(settings: AppSettings, providerId: ProviderKind): ModelProvider | undefined {
  return settings.providers.find((provider) => provider.id === providerId)
}

export function getModelEntry(settings: AppSettings, modelId: string): ModelEntry | undefined {
  return settings.models.find((model) => model.id === modelId)
}

export function listModelsByRole(settings: AppSettings, role: ModelRole): ModelEntry[] {
  return settings.models.filter((model) => model.roles.includes(role))
}

export function formatModelLabel(settings: AppSettings, model: ModelEntry): string {
  const modelLabel = model.label.trim() || model.modelId.trim() || '未命名模型'

  return `${getProviderLabel(model.providerId)} · ${modelLabel}`
}

export function resolveModelId(
  settings: AppSettings,
  role: ModelRole,
  selection?: ModelSelection,
): string {
  const selected =
    role === 'analysis' ? selection?.analysisModelId : selection?.editModelId

  if (selected) {
    return selected
  }

  return role === 'analysis' ? settings.defaultAnalysisModelId : settings.defaultEditModelId
}

export function resolveRunConfig(
  settings: AppSettings,
  selection?: ModelSelection,
): Config | null {
  const analysisModelId = resolveModelId(settings, 'analysis', selection)
  const editModelId = resolveModelId(settings, 'edit', selection)

  const analysisModel = getModelEntry(settings, analysisModelId)
  const editModel = getModelEntry(settings, editModelId)

  if (!analysisModel || !editModel) {
    return null
  }

  const analysisProvider = getProvider(settings, analysisModel.providerId)
  const editProvider = getProvider(settings, editModel.providerId)

  if (!analysisProvider || !editProvider) {
    return null
  }

  if (!analysisModel.roles.includes('analysis') || !editModel.roles.includes('edit')) {
    return null
  }

  return {
    analysis: {
      host: analysisProvider.host,
      key: analysisProvider.key,
      model: analysisModel.modelId,
    },
    edit: {
      host: editProvider.host,
      key: editProvider.key,
      model: editModel.modelId,
    },
  }
}

export async function validateRunConfig(
  settings: AppSettings,
  selection?: ModelSelection,
): Promise<Config> {
  const config = resolveRunConfig(settings, selection)

  if (!config) {
    throw new Error('请先在设置中配置默认模型，或在操作面板选择模型')
  }

  return InitConfig(config)
}

export function validateAppSettings(settings: AppSettings): string | null {
  if (settings.providers.length !== 3) {
    return '提供商配置不完整'
  }

  for (const provider of settings.providers) {
    if (!isProviderKind(provider.id)) {
      return '存在无效的提供商类型'
    }

    if (!provider.host.trim()) {
      return `请为「${getProviderLabel(provider.id)}」配置 API Host`
    }
  }

  if (settings.models.length === 0) {
    return '请至少添加一个模型'
  }

  for (const model of settings.models) {
    if (!model.modelId.trim() || !model.label.trim()) {
      return '模型名称与 Model ID 不能为空'
    }

    if (model.roles.length === 0) {
      return '每个模型至少选择一种用途（分析或修图）'
    }

    if (!getProvider(settings, model.providerId)) {
      return '存在未关联提供商的模型，请检查配置'
    }
  }

  const analysisModels = listModelsByRole(settings, 'analysis')
  const editModels = listModelsByRole(settings, 'edit')

  if (analysisModels.length === 0) {
    return '请至少添加一个可用于分析的模型'
  }

  if (editModels.length === 0) {
    return '请至少添加一个可用于修图的模型'
  }

  if (!settings.defaultAnalysisModelId || !getModelEntry(settings, settings.defaultAnalysisModelId)) {
    return '请选择默认分析模型'
  }

  if (!settings.defaultEditModelId || !getModelEntry(settings, settings.defaultEditModelId)) {
    return '请选择默认修图模型'
  }

  const defaultAnalysis = getModelEntry(settings, settings.defaultAnalysisModelId)
  const defaultEdit = getModelEntry(settings, settings.defaultEditModelId)

  if (!defaultAnalysis?.roles.includes('analysis')) {
    return '默认分析模型须支持分析用途'
  }

  if (!defaultEdit?.roles.includes('edit')) {
    return '默认修图模型须支持修图用途'
  }

  const usedProviderIds = new Set(settings.models.map((model) => model.providerId))

  for (const provider of settings.providers) {
    if (usedProviderIds.has(provider.id) && !provider.key.trim()) {
      return `请为「${getProviderLabel(provider.id)}」配置 API Key`
    }
  }

  return null
}

export async function validateAndResolveDefaults(settings: AppSettings): Promise<AppSettings> {
  const normalized = normalizeAppSettings(settings)
  const error = validateAppSettings(normalized)

  if (error) {
    throw new Error(error)
  }

  await validateRunConfig(normalized)

  return normalized
}

export { getProviderDefinition, getProviderLabel }
