<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { PanelLeft, PanelLeftClose, Settings } from '@lucide/vue'

const menuItems = ['编辑', '视图', '帮助'] as const

const fileMenuItems = [
  { id: 'new-workspace', label: '新建工作区', dividerAfter: true },
  { id: 'open', label: '打开' },
  { id: 'save', label: '保存', shortcut: true },
] as const

type FileMenuAction = (typeof fileMenuItems)[number]['id']

const props = defineProps<{
  saveEnabled: boolean
  sidebarVisible: boolean
}>()

const emit = defineEmits<{
  settingsClick: []
  toggleSidebar: []
  menuClick: [menu: (typeof menuItems)[number]]
  fileAction: [action: FileMenuAction]
}>()

const fileMenuOpen = ref(false)
const fileMenuRef = ref<HTMLElement | null>(null)
const saveShortcutLabel = /Mac|iPhone|iPad/i.test(navigator.userAgent) ? '⌘S' : 'Ctrl+S'

function toggleFileMenu() {
  fileMenuOpen.value = !fileMenuOpen.value
}

function closeFileMenu() {
  fileMenuOpen.value = false
}

function onFileAction(action: FileMenuAction) {
  emit('fileAction', action)
  closeFileMenu()
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!fileMenuOpen.value) {
    return
  }

  if (fileMenuRef.value?.contains(event.target as Node)) {
    return
  }

  closeFileMenu()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <header
    class="relative z-50 flex h-10 shrink-0 items-center justify-between border-b border-app-border bg-app/95 px-3 backdrop-blur-sm"
  >
    <nav class="flex min-w-0 items-center gap-3">
      <span class="shrink-0 text-sm font-semibold tracking-tight text-app-foreground">豆沙包</span>

      <div class="flex items-center gap-0.5">
        <div ref="fileMenuRef" class="relative">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-sm transition-colors"
            :class="
              fileMenuOpen
                ? 'bg-app-accent text-app-foreground'
                : 'text-app-muted hover:bg-app-accent hover:text-app-foreground'
            "
            aria-haspopup="menu"
            :aria-expanded="fileMenuOpen"
            @click.stop="toggleFileMenu"
          >
            文件
          </button>

          <div
            v-if="fileMenuOpen"
            class="absolute left-0 top-full z-50 min-w-36 pt-1"
            role="presentation"
            @pointerdown.stop
          >
            <div
              class="overflow-hidden rounded-lg border border-app-border bg-app-elevated py-1 shadow-lg shadow-black/10"
              role="menu"
            >
              <template v-for="item in fileMenuItems" :key="item.id">
                <button
                  type="button"
                  class="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors"
                  :class="
                    item.id === 'save' && !props.saveEnabled
                      ? 'cursor-not-allowed text-app-subtle'
                      : 'text-app-foreground hover:bg-app-accent'
                  "
                  role="menuitem"
                  :aria-disabled="item.id === 'save' && !props.saveEnabled"
                  @click="onFileAction(item.id)"
                >
                  <span>{{ item.label }}</span>
                  <span
                    v-if="'shortcut' in item && item.shortcut"
                    class="ml-auto pl-4 text-xs text-app-subtle"
                  >
                    {{ saveShortcutLabel }}
                  </span>
                </button>
                <div
                  v-if="'dividerAfter' in item && item.dividerAfter"
                  class="my-1 border-t border-app-border"
                  role="separator"
                />
              </template>
            </div>
          </div>
        </div>

        <button
          v-for="menu in menuItems"
          :key="menu"
          type="button"
          class="rounded-md px-2.5 py-1 text-sm text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
          @click="emit('menuClick', menu)"
        >
          {{ menu }}
        </button>
      </div>
    </nav>

    <div class="flex items-center gap-0.5">
      <button
        type="button"
        class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
        :aria-label="props.sidebarVisible ? '隐藏侧边栏' : '显示侧边栏'"
        :aria-pressed="props.sidebarVisible"
        @click="emit('toggleSidebar')"
      >
        <PanelLeftClose v-if="props.sidebarVisible" :size="16" :stroke-width="1.75" />
        <PanelLeft v-else :size="16" :stroke-width="1.75" />
      </button>

      <button
        type="button"
        class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
        aria-label="设置"
        @click="emit('settingsClick')"
      >
        <Settings :size="16" :stroke-width="1.75" />
      </button>
    </div>
  </header>
</template>
