<script setup lang="ts">
import { X } from '@lucide/vue'

import type { WorkspaceTabItem } from '@/types/workspace'

defineProps<{
  tabs: WorkspaceTabItem[]
  activeTabId: string
}>()

const emit = defineEmits<{
  select: [workspaceId: string]
  close: [workspaceId: string]
}>()
</script>

<template>
  <div
    class="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto border-b border-neutral-200/80 bg-neutral-50/60 px-2"
    role="tablist"
  >
    <div
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      class="relative -mb-px flex max-w-48 shrink-0 items-center gap-1 rounded-t-md border pl-3 pr-1.5 py-1.5 transition-colors"
      :class="
        tab.id === activeTabId
          ? 'border-neutral-200/80 border-b-white bg-white text-neutral-900'
          : 'border-transparent text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-800'
      "
      :aria-selected="tab.id === activeTabId"
    >
      <button
        type="button"
        class="min-w-0 truncate text-sm"
        @click="emit('select', tab.id)"
      >
        {{ tab.title }}
      </button>
      <button
        type="button"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-700"
        aria-label="关闭工作区"
        @click.stop="emit('close', tab.id)"
      >
        <X :size="12" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>
