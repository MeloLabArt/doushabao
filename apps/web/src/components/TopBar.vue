<script setup lang="ts">
import { Settings } from '@lucide/vue'

const menuItems = ['文件', '编辑', '视图', '帮助'] as const

const emit = defineEmits<{
  settingsClick: []
  menuClick: [menu: (typeof menuItems)[number]]
}>()
</script>

<template>
  <header
    class="flex h-10 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-neutral-50/80 px-3 backdrop-blur-sm"
  >
    <nav class="flex min-w-0 items-center gap-3">
      <span class="shrink-0 text-sm font-semibold tracking-tight text-neutral-900">豆沙包</span>

      <div class="flex items-center gap-0.5">
        <button
          v-for="menu in menuItems"
          :key="menu"
          type="button"
          class="rounded-md px-2.5 py-1 text-sm text-neutral-600 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900"
          @click="emit('menuClick', menu)"
        >
          {{ menu }}
        </button>
      </div>
    </nav>

    <button
      type="button"
      class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-800"
      aria-label="设置"
      @click="emit('settingsClick')"
    >
      <Settings :size="16" :stroke-width="1.75" />
    </button>
  </header>
</template>
