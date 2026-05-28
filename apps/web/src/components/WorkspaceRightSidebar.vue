<script setup lang="ts">
import { Download, LoaderCircle, Sparkles, Trash2, Wand2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import {
  DEFICIENCY_CATEGORY_LABELS,
  DEFICIENCY_SEVERITY_LABELS,
  IMAGE_TYPE_LABELS,
} from '@/lib/agent-labels'
import ModelSelect from '@/components/ModelSelect.vue'
import { listModelsByRole } from '@/lib/app-settings'
import { loadAppSettings } from '@/lib/config-storage'
import { exportWorkspaceImage } from '@/lib/export-workspace-image'
import { runWorkspaceAgent } from '@/lib/run-workspace-agent'
import { runWorkspaceEditor } from '@/lib/run-workspace-editor'
import {
  getWorkspace,
  getWorkspaceImageRevision,
  openWorkspaces,
  setWorkspaceEditing,
  applyWorkspaceGeneratedImage,
} from '@/lib/workspace-session'
import {
  clearWorkspaceRunPresentation,
  getWorkspaceAgentPrompt,
  getWorkspaceAnalysis,
  getWorkspaceEditMode,
  getWorkspaceEditorMarks,
  getWorkspaceModelSelection,
  getWorkspaceRunError,
  getWorkspaceRunStep,
  getWorkspaceSelectedAnalysisModelId,
  getWorkspaceSelectedEditModelId,
  isWorkspaceRunning,
  setWorkspaceAgentPrompt,
  setWorkspaceAnalysis,
  setWorkspaceEditMode,
  setWorkspaceEditorMarks,
  setWorkspaceRunError,
  setWorkspaceRunStep,
  setWorkspaceSelectedAnalysisModelId,
  setWorkspaceSelectedEditModelId,
  workspaceUiRevision,
  clearWorkspaceEditorMarks,
} from '@/lib/workspace-ui-state'
import type { EditorMark } from '@/types/editor-mark'

const props = defineProps<{
  activeWorkspaceId: string
}>()

const isExporting = ref(false)
const exportError = ref('')

const modeOptions = [
  { value: 'agent' as const, label: 'Agent' },
  { value: 'editor' as const, label: 'Editor' },
]

const workspace = computed(() => {
  openWorkspaces.value

  if (!props.activeWorkspaceId) {
    return null
  }

  return getWorkspace(props.activeWorkspaceId)
})

const editMode = computed(() => {
  workspaceUiRevision.value

  if (!props.activeWorkspaceId) {
    return 'agent' as const
  }

  return getWorkspaceEditMode(props.activeWorkspaceId)
})

const editorMarks = computed(() => {
  workspaceUiRevision.value

  if (!props.activeWorkspaceId) {
    return [] as EditorMark[]
  }

  return getWorkspaceEditorMarks(props.activeWorkspaceId)
})

const agentPrompt = computed({
  get() {
    workspaceUiRevision.value

    if (!props.activeWorkspaceId) {
      return ''
    }

    return getWorkspaceAgentPrompt(props.activeWorkspaceId)
  },
  set(value: string) {
    if (!props.activeWorkspaceId) {
      return
    }

    setWorkspaceAgentPrompt(props.activeWorkspaceId, value)
  },
})

const hasImage = computed(
  () => Boolean(workspace.value?.sourceImage || workspace.value?.hasSourceImage),
)

const isRunning = computed(() => {
  workspaceUiRevision.value

  if (!props.activeWorkspaceId) {
    return false
  }

  return isWorkspaceRunning(props.activeWorkspaceId)
})

const runStep = computed(() => {
  workspaceUiRevision.value

  if (!props.activeWorkspaceId) {
    return null
  }

  return getWorkspaceRunStep(props.activeWorkspaceId)
})

const error = computed(() => {
  workspaceUiRevision.value

  if (!props.activeWorkspaceId) {
    return ''
  }

  return getWorkspaceRunError(props.activeWorkspaceId)
})

const analysis = computed(() => {
  workspaceUiRevision.value

  if (!props.activeWorkspaceId) {
    return null
  }

  return getWorkspaceAnalysis(props.activeWorkspaceId)
})

const appSettings = computed(() => {
  workspaceUiRevision.value
  return loadAppSettings()
})

const analysisModels = computed(() => listModelsByRole(appSettings.value, 'analysis'))
const editModels = computed(() => listModelsByRole(appSettings.value, 'edit'))

const selectedAnalysisModelId = computed({
  get() {
    workspaceUiRevision.value

    if (!props.activeWorkspaceId) {
      return ''
    }

    return (
      getWorkspaceSelectedAnalysisModelId(props.activeWorkspaceId)
      ?? appSettings.value.defaultAnalysisModelId
    )
  },
  set(value: string) {
    if (!props.activeWorkspaceId) {
      return
    }

    setWorkspaceSelectedAnalysisModelId(
      props.activeWorkspaceId,
      value === appSettings.value.defaultAnalysisModelId ? null : value,
    )
  },
})

const selectedEditModelId = computed({
  get() {
    workspaceUiRevision.value

    if (!props.activeWorkspaceId) {
      return ''
    }

    return (
      getWorkspaceSelectedEditModelId(props.activeWorkspaceId)
      ?? appSettings.value.defaultEditModelId
    )
  },
  set(value: string) {
    if (!props.activeWorkspaceId) {
      return
    }

    setWorkspaceSelectedEditModelId(
      props.activeWorkspaceId,
      value === appSettings.value.defaultEditModelId ? null : value,
    )
  },
})

const runStatusText = computed(() => {
  if (runStep.value === 'analysis') {
    return '正在分析图片…'
  }

  if (runStep.value === 'edit') {
    return editMode.value === 'editor' ? '正在按标注修图…' : '正在修图…'
  }

  return ''
})

function setEditMode(mode: 'agent' | 'editor') {
  if (!props.activeWorkspaceId || isWorkspaceRunning(props.activeWorkspaceId)) {
    return
  }

  setWorkspaceEditMode(props.activeWorkspaceId, mode)
}

function updateMarkDescription(markId: string, description: string) {
  if (!props.activeWorkspaceId) {
    return
  }

  const nextMarks = editorMarks.value.map((mark) =>
    mark.id === markId ? { ...mark, description } : mark,
  )

  setWorkspaceEditorMarks(props.activeWorkspaceId, nextMarks)
}

function removeMark(markId: string) {
  if (!props.activeWorkspaceId || isWorkspaceRunning(props.activeWorkspaceId)) {
    return
  }

  setWorkspaceEditorMarks(
    props.activeWorkspaceId,
    editorMarks.value.filter((mark) => mark.id !== markId),
  )
}

watch(
  () =>
    props.activeWorkspaceId
      ? getWorkspaceImageRevision(props.activeWorkspaceId)
      : 0,
  () => {
    if (!props.activeWorkspaceId || isWorkspaceRunning(props.activeWorkspaceId)) {
      return
    }

    clearWorkspaceRunPresentation(props.activeWorkspaceId)
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
  const workspaceId = currentWorkspace?.id

  if (!currentWorkspace || !workspaceId || isWorkspaceRunning(workspaceId)) {
    return
  }

  const prompt = getWorkspaceAgentPrompt(workspaceId)

  setWorkspaceRunStep(workspaceId, 'analysis')
  setWorkspaceRunError(workspaceId, '')
  setWorkspaceAnalysis(workspaceId, null)
  setWorkspaceEditing(workspaceId, true)

  try {
    const result = await runWorkspaceAgent(currentWorkspace, prompt, {
      onProgress: (step) => {
        setWorkspaceRunStep(workspaceId, step)
      },
      modelSelection: getWorkspaceModelSelection(workspaceId),
    })
    setWorkspaceAnalysis(workspaceId, result.analysis)

    const nextImage = result.images[0]
    if (!nextImage) {
      throw new Error('修图模型未返回图片')
    }

    await applyWorkspaceGeneratedImage(currentWorkspace, nextImage)
  } catch (err) {
    setWorkspaceRunError(workspaceId, err instanceof Error ? err.message : 'Agent 执行失败')
  } finally {
    setWorkspaceEditing(workspaceId, false)
    setWorkspaceRunStep(workspaceId, null)
  }
}

async function handleEditorRun() {
  const currentWorkspace = workspace.value
  const workspaceId = currentWorkspace?.id

  if (!currentWorkspace || !workspaceId || isWorkspaceRunning(workspaceId)) {
    return
  }

  const marks = getWorkspaceEditorMarks(workspaceId)

  setWorkspaceRunStep(workspaceId, 'edit')
  setWorkspaceRunError(workspaceId, '')
  setWorkspaceEditing(workspaceId, true)

  let succeeded = false

  try {
    const nextImage = await runWorkspaceEditor(
      currentWorkspace,
      marks,
      getWorkspaceModelSelection(workspaceId),
    )
    await applyWorkspaceGeneratedImage(currentWorkspace, nextImage)
    succeeded = true
  } catch (err) {
    setWorkspaceRunError(workspaceId, err instanceof Error ? err.message : 'Editor 修图失败')
  } finally {
    setWorkspaceEditing(workspaceId, false)
    setWorkspaceRunStep(workspaceId, null)

    if (succeeded) {
      clearWorkspaceEditorMarks(workspaceId)
    }
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
            class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              editMode === option.value
                ? 'bg-app-elevated text-app-foreground shadow-sm'
                : 'text-app-muted hover:text-app-foreground'
            "
            :aria-selected="editMode === option.value"
            :disabled="isRunning"
            @click="setEditMode(option.value)"
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
          在图片上拖拽画圈（带半径预览线）标注修改位置，按顺序自动编号；已有圈可拖拽移动。圈仅作位置指引，修图会对整张图生效。填写描述后提交，可与 Agent 模式随时切换。
        </p>

        <section v-if="editorMarks.length" class="space-y-2">
          <h3 class="text-xs font-medium text-app-muted uppercase">标注区域</h3>
          <div
            v-for="(mark, index) in editorMarks"
            :key="mark.id"
            class="rounded-lg border border-app-border bg-app-accent p-2.5"
          >
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-app-foreground">{{ index + 1 }} 号圈</span>
              <button
                type="button"
                class="rounded p-1 text-app-muted transition hover:bg-app-elevated hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isRunning"
                aria-label="删除标注"
                @click="removeMark(mark.id)"
              >
                <Trash2 :size="13" :stroke-width="1.75" />
              </button>
            </div>
            <textarea
              :value="mark.description"
              rows="2"
              placeholder="描述此区域要如何修改"
              :class="inputClass"
              :disabled="isRunning"
              @input="updateMarkDescription(mark.id, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </section>

        <p v-else class="rounded-lg border border-dashed border-app-border px-3 py-4 text-center text-xs text-app-subtle">
          尚未圈选区域
        </p>

        <label class="block space-y-1.5">
          <span class="text-xs font-medium text-app-muted">修图模型</span>
          <ModelSelect
            v-model="selectedEditModelId"
            :settings="appSettings"
            :models="editModels"
            :disabled="isRunning"
            placeholder="选择修图模型"
          />
        </label>

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-primary px-3 py-2 text-sm font-medium text-app-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isRunning || editorMarks.length === 0"
          @click="handleEditorRun"
        >
          <LoaderCircle v-if="isRunning" :size="15" :stroke-width="1.75" class="animate-spin" />
          <Wand2 v-else :size="15" :stroke-width="1.75" />
          {{ isRunning ? '处理中…' : '开始修图' }}
        </button>

        <p v-if="runStatusText" class="text-xs text-app-muted">{{ runStatusText }}</p>
        <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>

        <div class="border-t border-app-border pt-3">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-accent px-3 py-2 text-sm font-medium text-app-foreground transition hover:bg-app-elevated disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isExporting || isRunning"
            @click="handleExportImage"
          >
            <LoaderCircle v-if="isExporting" :size="15" :stroke-width="1.75" class="animate-spin" />
            <Download v-else :size="15" :stroke-width="1.75" />
            {{ isExporting ? '导出中…' : '导出图片' }}
          </button>
          <p v-if="exportError" class="mt-2 text-xs text-red-600 dark:text-red-400">{{ exportError }}</p>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col gap-3">
        <p class="text-xs leading-relaxed text-app-muted">
          自动分析并修图；完成后可切换到 Editor 做局部标注精修。
        </p>

        <label class="block space-y-1.5">
          <span class="text-sm font-medium text-app-foreground">修图需求（可选）</span>
          <textarea
            v-model="agentPrompt"
            rows="6"
            placeholder="描述你想对图片做的修改；留空则根据分析结果自动优化"
            :class="inputClass"
            :disabled="isRunning"
          />
        </label>

        <div class="space-y-3 rounded-lg border border-app-border bg-app-accent/50 p-3">
          <h3 class="text-xs font-medium text-app-muted uppercase">本次运行模型</h3>

          <label class="block space-y-1.5">
            <span class="text-xs text-app-muted">分析模型</span>
            <ModelSelect
              v-model="selectedAnalysisModelId"
              :settings="appSettings"
              :models="analysisModels"
              :disabled="isRunning"
              placeholder="选择分析模型"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs text-app-muted">修图模型</span>
            <ModelSelect
              v-model="selectedEditModelId"
              :settings="appSettings"
              :models="editModels"
              :disabled="isRunning"
              placeholder="选择修图模型"
            />
          </label>
        </div>

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
