<script setup lang="ts">
import type { Config } from '@doushabao/core'
import { ArrowLeft } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { DEFAULT_OPENROUTER_HOST, loadConfig, saveConfig } from '@/lib/config-storage'

const router = useRouter()

const form = ref<Config>({
  host: DEFAULT_OPENROUTER_HOST,
  key: '',
  model: '',
})

const saving = ref(false)
const error = ref('')
const saved = ref(false)

onMounted(() => {
  form.value = loadConfig()
})

function goHome() {
  router.push('/')
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
    <button
      type="button"
      class="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
      @click="goHome"
    >
      <ArrowLeft :size="16" :stroke-width="1.75" />
      返回主工作区
    </button>

    <div class="mb-6">
      <h1 class="text-lg font-semibold text-neutral-900">设置</h1>
      <p class="mt-1 text-sm text-neutral-500">配置 OpenRouter API，用于 AI 图像生成。</p>
    </div>

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-neutral-700">API Host</span>
        <input
          v-model="form.host"
          type="url"
          required
          autocomplete="off"
          placeholder="https://openrouter.ai/api/v1"
          class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
        <span class="text-xs text-neutral-400">OpenRouter API 地址，默认为官方端点。</span>
      </label>

      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-neutral-700">API Key</span>
        <input
          v-model="form.key"
          type="password"
          required
          autocomplete="off"
          placeholder="sk-or-..."
          class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
        <span class="text-xs text-neutral-400">保存在本地浏览器，不会上传到服务器。</span>
      </label>

      <label class="block space-y-1.5">
        <span class="text-sm font-medium text-neutral-700">Model</span>
        <input
          v-model="form.model"
          type="text"
          required
          autocomplete="off"
          placeholder="google/gemini-2.5-flash-preview"
          class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
        <span class="text-xs text-neutral-400">OpenRouter 模型 ID，需支持图像输出。</span>
      </label>

      <div class="flex items-center gap-3 pt-1">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>

        <p v-if="saved" class="text-sm text-emerald-600">已保存</p>
        <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>
    </form>
  </section>
</template>
