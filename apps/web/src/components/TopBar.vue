<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Settings } from '@lucide/vue'

const menuItems = ['编辑', '视图', '帮助'] as const

const fileMenuItems = [
  { id: 'new-workspace', label: '新建工作区', dividerAfter: true },
  { id: 'open', label: '打开' },
  { id: 'save', label: '保存' },
] as const

type FileMenuAction = (typeof fileMenuItems)[number]['id']

const emit = defineEmits<{
  settingsClick: []
  menuClick: [menu: (typeof menuItems)[number]]
  fileAction: [action: FileMenuAction]
}>()

const fileMenuOpen = ref(false)
const fileMenuRef = ref<HTMLElement | null>(null)

function toggleFileMenu() {
  fileMenuOpen.value = !fileMenuOpen.value
}

function closeFileMenu() {
  fileMenuOpen.value = false
}

function onFileAction(action: FileMenuAction) {
  closeFileMenu()
  emit('fileAction', action)
}

function onDocumentClick(event: MouseEvent) {
  if (fileMenuRef.value?.contains(event.target as Node)) {
    return
  }
  closeFileMenu()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <header
    class="flex h-10 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-neutral-50/80 px-3 backdrop-blur-sm"
  >
    <nav class="flex min-w-0 items-center gap-3">
      <span class="shrink-0 text-sm font-semibold tracking-tight text-neutral-900">豆沙包</span>

      <div class="flex items-center gap-0.5">
        <div ref="fileMenuRef" class="relative">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-sm transition-colors"
            :class="
              fileMenuOpen
                ? 'bg-neutral-200/70 text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
            "
            aria-haspopup="menu"
            :aria-expanded="fileMenuOpen"
            @click.stop="toggleFileMenu"
          >
            文件
          </button>

          <div
            v-if="fileMenuOpen"
            class="absolute left-0 top-[calc(100%+4px)] z-50 min-w-36 overflow-hidden rounded-lg border border-neutral-200/90 bg-white py-1 shadow-lg shadow-neutral-900/10"
            role="menu"
          >
            <template v-for="item in fileMenuItems" :key="item.id">
              <button
                type="button"
                class="flex w-full items-center px-3 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                role="menuitem"
                @click="onFileAction(item.id)"
              >
                {{ item.label }}
              </button>
              <div
                v-if="item.dividerAfter"
                class="my-1 border-t border-neutral-200/80"
                role="separator"
              />
            </template>
          </div>
        </div>

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
