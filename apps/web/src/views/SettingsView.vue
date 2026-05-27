<script setup lang="ts">
import type { Config } from '@doushabao/core'
import { onMounted, ref } from 'vue'

import { DEFAULT_OPENROUTER_HOST, loadConfig, saveConfig } from '@/lib/config-storage'
import { type Theme, applyTheme, loadTheme, saveTheme } from '@/lib/theme-storage'

const form = ref<Config>({
  host: DEFAULT_OPENROUTER_HOST,
  key: '',
  model: '',
})

const theme = ref<Theme>('light')
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const inputClass =
  'w-full rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-foreground outline-none transition placeholder:text-app-subtle focus:border-app-muted focus:ring-2 focus:ring-app-accent'

onMounted(() => {
  form.value = loadConfig()
  theme.value = loadTheme()
})

function setTheme(nextTheme: Theme) {
  theme.value = nextTheme
  saveTheme(nextTheme)
  applyTheme(nextTheme)
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  saved.value = false

  try {
    form.value = await saveConfig(form.value)
    saved.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-xl p-6">
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-app-foreground">设置</h1>
      <p class="mt-1 text-sm text-app-muted">配置 OpenRouter API，用于 AI 图像生成。</p>
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

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-app-foreground">API Host</span>
        <input
          v-model="form.host"
          type="url"
          required
          autocomplete="off"
          placeholder="https://openrouter.ai/api/v1"
          :class="inputClass"
        />
        <span class="text-xs text-app-subtle">OpenRouter API 地址，默认为官方端点。</span>
      </label>

      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-app-foreground">API Key</span>
        <input
          v-model="form.key"
          type="password"
          required
          autocomplete="off"
          placeholder="sk-or-..."
          :class="inputClass"
        />
        <span class="text-xs text-app-subtle">保存在本地浏览器，不会上传到服务器。</span>
      </label>

      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-app-foreground">Model</span>
        <input
          v-model="form.model"
          type="text"
          required
          autocomplete="off"
          placeholder="google/gemini-2.5-flash-preview"
          :class="inputClass"
        />
        <span class="text-xs text-app-subtle">OpenRouter 模型 ID，需支持图像输出。</span>
      </label>

      <div class="flex items-center gap-3 pt-1">
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
