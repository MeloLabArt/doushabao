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
    class="flex h-9 shrink-0 items-stretch gap-0.5 overflow-x-auto overflow-y-hidden border-b border-app-border bg-app px-2"
    role="tablist"
  >
    <div
      v-for="tab in tabs"
      :key="tab.id"
      role="tab"
      class="flex h-full max-w-52 shrink-0 items-center gap-1 rounded-t-md border border-b-0 pl-3 pr-1.5 transition-colors"
      :class="
        tab.id === activeTabId
          ? 'border-app-border bg-app-elevated text-app-foreground'
          : 'border-transparent text-app-muted hover:bg-app-accent hover:text-app-foreground'
      "
      :aria-selected="tab.id === activeTabId"
    >
      <button
        type="button"
        class="flex min-w-0 items-center gap-1 truncate text-sm leading-none"
        @click="emit('select', tab.id)"
      >
        <span class="truncate">{{ tab.title }}</span>
        <span
          v-if="tab.isDirty"
          class="shrink-0 text-app-subtle"
          aria-label="有未保存的更改"
          title="有未保存的更改"
        >
          •
        </span>
      </button>
      <button
        type="button"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded text-app-subtle transition-colors hover:bg-app-accent hover:text-app-foreground"
        aria-label="关闭标签页"
        @click.stop="emit('close', tab.id)"
      >
        <X :size="12" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>
