<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import { getWorkspace, openWorkspaces } from '@/lib/workspace-session'

const props = defineProps<{
  activeWorkspaceId: string
}>()

const prompt = ref('')

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

watch(
  () => props.activeWorkspaceId,
  () => {
    prompt.value = ''
  },
)

const inputClass =
  'w-full resize-none rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-foreground outline-none transition placeholder:text-app-subtle focus:border-app-muted focus:ring-2 focus:ring-app-accent'
</script>

<template>
  <aside
    class="flex w-64 shrink-0 flex-col border-l border-app-border bg-app"
    aria-label="编辑面板"
  >
    <div class="border-b border-app-border px-3 py-2.5">
      <h2 class="text-xs font-medium tracking-wide text-app-muted uppercase">编辑</h2>
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <p v-if="!activeWorkspaceId" class="px-1 py-6 text-center text-xs text-app-subtle">
        打开或新建工作区以开始编辑
      </p>

      <p v-else-if="!hasImage" class="px-1 py-6 text-center text-xs text-app-subtle">
        请先上传图片
      </p>

      <div v-else class="flex min-h-0 flex-1 flex-col gap-3">
        <label class="block space-y-1.5">
          <span class="text-sm font-medium text-app-foreground">编辑描述</span>
          <textarea
            v-model="prompt"
            rows="8"
            placeholder="描述你想对图片做的修改，例如：把背景换成海边日落"
            :class="inputClass"
          />
        </label>

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-primary px-3 py-2 text-sm font-medium text-app-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!prompt.trim()"
        >
          <Sparkles :size="15" :stroke-width="1.75" />
          生成
        </button>
      </div>
    </div>
  </aside>
</template>
