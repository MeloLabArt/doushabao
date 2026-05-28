<script setup lang="ts">
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import type { WorkspaceTabItem } from '@/types/workspace'

const { t } = useI18n()

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
          :aria-label="t('tab.unsavedChanges')"
          :title="t('tab.unsavedChanges')"
        >
          •
        </span>
      </button>
      <button
        type="button"
        class="inline-flex size-5 shrink-0 items-center justify-center rounded text-app-subtle transition-colors hover:bg-app-accent hover:text-app-foreground"
        :aria-label="t('tab.closeTab')"
        @click.stop="emit('close', tab.id)"
      >
        <X :size="12" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>
