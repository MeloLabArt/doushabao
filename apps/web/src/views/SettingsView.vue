<script setup lang="ts">
import { ChevronDown, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'

import { createId, getProviderDefinition, listModelsByRole } from '@/lib/app-settings'
import { loadAppSettings, saveAppSettings } from '@/lib/config-storage'
import ModelSelect from '@/components/ModelSelect.vue'
import { PROVIDER_KINDS } from '@/lib/model-providers'
import { type Theme, applyTheme, loadTheme, saveTheme } from '@/lib/theme-storage'
import type { AppSettings, ModelEntry, ModelRole, ProviderKind } from '@/types/app-settings'

const form = ref<AppSettings>({
  providers: [],
  models: [],
  defaultAnalysisModelId: '',
  defaultEditModelId: '',
})

const theme = ref<Theme>('light')
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const analysisModels = computed(() => listModelsByRole(form.value, 'analysis'))
const editModels = computed(() => listModelsByRole(form.value, 'edit'))

const inputClass =
  'w-full rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-foreground outline-none transition placeholder:text-app-subtle focus:border-app-muted focus:ring-2 focus:ring-app-accent'

const roleOptions: { value: ModelRole; label: string }[] = [
  { value: 'analysis', label: '分析' },
  { value: 'edit', label: '修图' },
]

const expandedProviders = reactive<Record<ProviderKind, boolean>>({
  openrouter: true,
  gemini: false,
  'openai-compatible': false,
})

function isProviderExpanded(kind: ProviderKind): boolean {
  return expandedProviders[kind]
}

function toggleProviderExpanded(kind: ProviderKind): void {
  expandedProviders[kind] = !expandedProviders[kind]
}

function syncProviderExpandedState(settings: AppSettings): void {
  for (const kind of PROVIDER_KINDS) {
    const provider = settings.providers.find((item) => item.id === kind)
    const modelCount = settings.models.filter((model) => model.providerId === kind).length
    const hasContent = Boolean(provider?.key.trim()) || modelCount > 0

    if (hasContent) {
      expandedProviders[kind] = true
    }
  }
}

onMounted(() => {
  form.value = loadAppSettings()
  syncProviderExpandedState(form.value)
  theme.value = loadTheme()
})

function setTheme(nextTheme: Theme) {
  theme.value = nextTheme
  saveTheme(nextTheme)
  applyTheme(nextTheme)
}

function providerDef(kind: ProviderKind) {
  return getProviderDefinition(kind)
}

function addModel(providerId: ProviderKind) {
  const id = createId()
  form.value.models.push({
    id,
    providerId,
    modelId: '',
    label: '',
    roles: ['edit'],
  })
  expandedProviders[providerId] = true
}

function providerSummary(kind: ProviderKind): string {
  const modelCount = modelsForProvider(kind).length
  const hasKey = Boolean(form.value.providers.find((provider) => provider.id === kind)?.key.trim())

  if (modelCount > 0 && hasKey) {
    return `${modelCount} 个模型 · 已配置 Key`
  }

  if (modelCount > 0) {
    return `${modelCount} 个模型`
  }

  if (hasKey) {
    return '已配置 Key'
  }

  return '未配置'
}

function removeModel(modelId: string) {
  form.value.models = form.value.models.filter((model) => model.id !== modelId)

  if (form.value.defaultAnalysisModelId === modelId) {
    form.value.defaultAnalysisModelId = analysisModels.value[0]?.id ?? ''
  }

  if (form.value.defaultEditModelId === modelId) {
    form.value.defaultEditModelId = editModels.value[0]?.id ?? ''
  }
}

function toggleModelRole(model: ModelEntry, role: ModelRole) {
  if (model.roles.includes(role)) {
    model.roles = model.roles.filter((item) => item !== role)
    return
  }

  model.roles = [...model.roles, role]
}

function modelsForProvider(providerId: ProviderKind): ModelEntry[] {
  return form.value.models.filter((model) => model.providerId === providerId)
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  saved.value = false

  try {
    form.value = await saveAppSettings(form.value)
    saved.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-2xl p-6">
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-app-foreground">设置</h1>
      <p class="mt-1 text-sm text-app-muted">
        支持 OpenRouter、Gemini、OpenAI 兼容三种提供商；配置模型后可在工作区操作面板临时切换。
      </p>
    </div>

    <section class="mb-8 space-y-3">
      <div>
        <h2 class="text-sm font-medium text-app-foreground">外观</h2>
        <p class="mt-1 text-xs text-app-subtle">选择界面配色方案。</p>
      </div>

      <div
        class="inline-flex rounded-lg border border-app-border bg-app-accent p-1"
        role="radiogroup"
        aria-label="主题"
      >
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="rounded-md px-4 py-1.5 text-sm transition-colors"
          :class="
            theme === option.value
              ? 'bg-app-elevated text-app-foreground shadow-sm'
              : 'text-app-muted hover:text-app-foreground'
          "
          :aria-checked="theme === option.value"
          @click="setTheme(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <form class="space-y-8" @submit.prevent="handleSubmit">
      <section class="space-y-4">
        <div>
          <h2 class="text-sm font-medium text-app-foreground">模型提供商</h2>
          <p class="mt-1 text-xs text-app-subtle">
            仅需为实际使用的提供商填写 API Key；未添加模型的提供商可留空。
          </p>
        </div>

        <div
          v-for="provider in form.providers"
          :key="provider.id"
          class="overflow-hidden rounded-xl border border-app-border bg-app-accent/40"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-app-accent/80"
            :aria-expanded="isProviderExpanded(provider.id)"
            @click="toggleProviderExpanded(provider.id)"
          >
            <ChevronDown
              :size="16"
              :stroke-width="1.75"
              class="shrink-0 text-app-muted transition-transform"
              :class="isProviderExpanded(provider.id) ? 'rotate-0' : '-rotate-90'"
            />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-app-foreground">
                {{ providerDef(provider.id).name }}
              </span>
              <span class="mt-0.5 block text-xs text-app-subtle">
                {{ providerSummary(provider.id) }}
              </span>
            </span>
          </button>

          <div v-show="isProviderExpanded(provider.id)" class="space-y-4 border-t border-app-border px-4 py-4">
          <div class="grid gap-4">
            <label class="block space-y-1.5">
              <span class="text-xs font-medium text-app-muted">API Host</span>
              <input
                v-model="provider.host"
                type="url"
                required
                autocomplete="off"
                :readonly="!providerDef(provider.id).hostEditable"
                :placeholder="providerDef(provider.id).defaultHost"
                :class="[
                  inputClass,
                  !providerDef(provider.id).hostEditable ? 'cursor-default opacity-80' : '',
                ]"
              />
              <span class="text-xs text-app-subtle">{{ providerDef(provider.id).hostHint }}</span>
            </label>

            <label class="block space-y-1.5">
              <span class="text-xs font-medium text-app-muted">API Key</span>
              <input
                v-model="provider.key"
                type="password"
                autocomplete="off"
                :placeholder="providerDef(provider.id).keyPlaceholder"
                :class="inputClass"
              />
              <span class="text-xs text-app-subtle">保存在本地浏览器，不会上传到服务器。</span>
            </label>
          </div>

          <div class="space-y-3 border-t border-app-border pt-4">
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-xs font-medium text-app-muted uppercase">模型列表</h4>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md border border-app-border px-2 py-1 text-[11px] font-medium text-app-foreground transition hover:bg-app-elevated"
                @click.stop="addModel(provider.id)"
              >
                <Plus :size="12" :stroke-width="1.75" />
                添加模型
              </button>
            </div>

            <p
              v-if="modelsForProvider(provider.id).length === 0"
              class="rounded-lg border border-dashed border-app-border px-3 py-3 text-center text-xs text-app-subtle"
            >
              尚未添加模型
            </p>

            <div
              v-for="model in modelsForProvider(provider.id)"
              :key="model.id"
              class="space-y-3 rounded-lg border border-app-border bg-app px-3 py-3"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-app-foreground">模型</span>
                <button
                  type="button"
                  class="rounded p-1 text-app-muted transition hover:bg-app-accent hover:text-red-600"
                  aria-label="删除模型"
                  @click="removeModel(model.id)"
                >
                  <Trash2 :size="12" :stroke-width="1.75" />
                </button>
              </div>

              <label class="block space-y-1">
                <span class="text-xs text-app-muted">显示名称</span>
                <input v-model="model.label" type="text" required placeholder="Gemini 分析" :class="inputClass" />
              </label>

              <label class="block space-y-1">
                <span class="text-xs text-app-muted">Model ID</span>
                <input
                  v-model="model.modelId"
                  type="text"
                  required
                  autocomplete="off"
                  :placeholder="providerDef(provider.id).modelIdPlaceholder"
                  :class="inputClass"
                />
              </label>

              <div class="space-y-1.5">
                <span class="text-xs text-app-muted">用途</span>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="roleOption in roleOptions"
                    :key="roleOption.value"
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-app-border px-2.5 py-1 text-xs transition"
                    :class="
                      model.roles.includes(roleOption.value)
                        ? 'bg-app-primary text-app-primary-foreground border-transparent'
                        : 'text-app-muted hover:bg-app-accent'
                    "
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      :checked="model.roles.includes(roleOption.value)"
                      @change="toggleModelRole(model, roleOption.value)"
                    />
                    {{ roleOption.label }}
                  </label>
                </div>
                <p class="text-[11px] text-app-subtle">
                  分析：理解图片并输出 JSON；修图：需支持图像输出。
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-app-border p-4">
        <div>
          <h2 class="text-sm font-medium text-app-foreground">默认模型</h2>
          <p class="mt-1 text-xs text-app-subtle">新建工作区或未手动选择时使用；操作面板可覆盖。</p>
        </div>

        <label class="block space-y-1.5">
          <span class="text-sm font-medium text-app-foreground">默认分析模型</span>
          <ModelSelect
            v-model="form.defaultAnalysisModelId"
            :settings="form"
            :models="analysisModels"
            placeholder="选择分析模型"
          />
        </label>

        <label class="block space-y-1.5">
          <span class="text-sm font-medium text-app-foreground">默认修图模型</span>
          <ModelSelect
            v-model="form.defaultEditModelId"
            :settings="form"
            :models="editModels"
            placeholder="选择修图模型"
          />
        </label>
      </section>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-app-primary px-4 py-2 text-sm font-medium text-app-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>

        <p v-if="saved" class="text-sm text-emerald-600 dark:text-emerald-400">已保存</p>
        <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>
    </form>
  </section>
</template>
