<script setup lang="ts">
import type { AgentImageAnalysis } from '@doushabao/agents'
import { Download, LoaderCircle, Sparkles } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import {
  DEFICIENCY_CATEGORY_LABELS,
  DEFICIENCY_SEVERITY_LABELS,
  IMAGE_TYPE_LABELS,
} from '@/lib/agent-labels'
import type { EditMode } from '@/lib/edit-mode'
import { exportWorkspaceImage } from '@/lib/export-workspace-image'
import { runWorkspaceAgent } from '@/lib/run-workspace-agent'
import { getWorkspace, openWorkspaces, setWorkspaceEditing, applyWorkspaceGeneratedImage, workspaceImageRevision } from '@/lib/workspace-session'

const props = defineProps<{
  activeWorkspaceId: string
}>()

const editMode = ref<EditMode>('agent')
const prompt = ref('')
const isRunning = ref(false)
const runStep = ref<'analysis' | 'edit' | null>(null)
const error = ref('')
const analysis = ref<AgentImageAnalysis | null>(null)
const isExporting = ref(false)
const exportError = ref('')

const modeOptions: { value: EditMode; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'editor', label: 'Editor' },
]

const workspace = computed(() => {
  openWorkspaces.value

  if (!props.activeWorkspaceId) {
    return null
  }

  return getWorkspace(props.activeWorkspaceId)
})

const hasImage = computed(
  () => Boolean(workspace.value?.sourceImage || workspace.value?.hasSourceImage),
)

const runStatusText = computed(() => {
  if (runStep.value === 'analysis') {
    return '正在分析图片…'
  }

  if (runStep.value === 'edit') {
    return '正在修图…'
  }

  return ''
})

function resetAgentState() {
  if (props.activeWorkspaceId) {
    setWorkspaceEditing(props.activeWorkspaceId, false)
  }

  prompt.value = ''
  error.value = ''
  analysis.value = null
  isRunning.value = false
  runStep.value = null
  isExporting.value = false
  exportError.value = ''
}

watch(
  () => props.activeWorkspaceId,
  () => {
    resetAgentState()
  },
)

watch(
  () => workspaceImageRevision.value,
  () => {
    analysis.value = null
    error.value = ''
    isRunning.value = false
    runStep.value = null
  },
)

async function handleExportImage() {
  const currentWorkspace = workspace.value

  if (!currentWorkspace || isExporting.value) {
    return
  }

  isExporting.value = true
  exportError.value = ''

  try {
    await exportWorkspaceImage(currentWorkspace)
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : '导出失败'
  } finally {
    isExporting.value = false
  }
}

async function handleAgentRun() {
  const currentWorkspace = workspace.value

  if (!currentWorkspace || isRunning.value) {
    return
  }

  isRunning.value = true
  runStep.value = 'analysis'
  error.value = ''
  analysis.value = null
  setWorkspaceEditing(currentWorkspace.id, true)

  try {
    const result = await runWorkspaceAgent(currentWorkspace, prompt.value, (step) => {
      runStep.value = step
    })
    analysis.value = result.analysis

    const nextImage = result.images[0]
    if (!nextImage) {
      throw new Error('修图模型未返回图片')
    }

    await applyWorkspaceGeneratedImage(currentWorkspace, nextImage)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Agent 执行失败'
  } finally {
    setWorkspaceEditing(currentWorkspace.id, false)
    isRunning.value = false
    runStep.value = null
  }
}

const inputClass =
  'w-full resize-none rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-foreground outline-none transition placeholder:text-app-subtle focus:border-app-muted focus:ring-2 focus:ring-app-accent'
</script>

<template>
  <aside
    class="flex w-64 shrink-0 flex-col border-l border-app-border bg-app"
    aria-label="编辑面板"
  >
    <div class="border-b border-app-border px-3 py-2.5">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-xs font-medium tracking-wide text-app-muted uppercase">编辑</h2>
        <div
          class="inline-flex rounded-md border border-app-border bg-app-accent p-0.5"
          role="tablist"
          aria-label="编辑模式"
        >
          <button
            v-for="option in modeOptions"
            :key="option.value"
            type="button"
            role="tab"
            class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
            :class="
              editMode === option.value
                ? 'bg-app-elevated text-app-foreground shadow-sm'
                : 'text-app-muted hover:text-app-foreground'
            "
            :aria-selected="editMode === option.value"
            @click="editMode = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <p v-if="!activeWorkspaceId" class="px-1 py-6 text-center text-xs text-app-subtle">
        打开或新建工作区以开始编辑
      </p>

      <p v-else-if="!hasImage" class="px-1 py-6 text-center text-xs text-app-subtle">
        请先上传图片
      </p>

      <div v-else-if="editMode === 'editor'" class="flex flex-col gap-3">
        <p class="text-xs leading-relaxed text-app-muted">
          将当前工作区图片导出到本地文件。
        </p>

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-accent px-3 py-2 text-sm font-medium text-app-foreground transition hover:bg-app-elevated disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isExporting"
          @click="handleExportImage"
        >
          <LoaderCircle v-if="isExporting" :size="15" :stroke-width="1.75" class="animate-spin" />
          <Download v-else :size="15" :stroke-width="1.75" />
          {{ isExporting ? '导出中…' : '导出图片' }}
        </button>

        <p v-if="exportError" class="text-xs text-red-600 dark:text-red-400">{{ exportError }}</p>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col gap-3">
        <label class="block space-y-1.5">
          <span class="text-sm font-medium text-app-foreground">修图需求（可选）</span>
          <textarea
            v-model="prompt"
            rows="6"
            placeholder="描述你想对图片做的修改；留空则根据分析结果自动优化"
            :class="inputClass"
            :disabled="isRunning"
          />
        </label>

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-primary px-3 py-2 text-sm font-medium text-app-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isRunning"
          @click="handleAgentRun"
        >
          <LoaderCircle v-if="isRunning" :size="15" :stroke-width="1.75" class="animate-spin" />
          <Sparkles v-else :size="15" :stroke-width="1.75" />
          {{ isRunning ? '处理中…' : '开始 Agent' }}
        </button>

        <p v-if="runStatusText" class="text-xs text-app-muted">{{ runStatusText }}</p>
        <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>

        <section v-if="analysis" class="space-y-3 rounded-lg border border-app-border bg-app-accent p-3">
          <div>
            <h3 class="text-xs font-medium text-app-muted uppercase">分析结果</h3>
            <p class="mt-1 text-sm text-app-foreground">
              {{ IMAGE_TYPE_LABELS[analysis.imageType] }}
            </p>
            <p class="mt-1 text-xs text-app-subtle">{{ analysis.imageTypeReason }}</p>
          </div>

          <div>
            <h4 class="text-xs font-medium text-app-muted">主要问题</h4>
            <ul class="mt-2 space-y-2">
              <li
                v-for="(item, index) in analysis.deficiencies"
                :key="`${item.category}-${index}`"
                class="rounded-md border border-app-border bg-app px-2.5 py-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-app-foreground">
                    {{ DEFICIENCY_CATEGORY_LABELS[item.category] }}
                  </span>
                  <span class="text-[11px] text-app-subtle">
                    {{ DEFICIENCY_SEVERITY_LABELS[item.severity] }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-app-muted">{{ item.description }}</p>
              </li>
            </ul>
          </div>

          <p class="text-xs leading-relaxed text-app-muted">{{ analysis.summary }}</p>

          <div>
            <h4 class="text-xs font-medium text-app-muted">修图指令</h4>
            <p class="mt-1 text-xs leading-relaxed text-app-foreground">{{ analysis.editPrompt }}</p>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>
