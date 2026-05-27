<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Check, PanelLeft, PanelLeftClose, PanelRight, PanelRightClose, Settings } from '@lucide/vue'

const navMenuItems = ['帮助'] as const

const editMenuItems = [{ id: 'undo', label: '撤回更改', shortcut: true }] as const

const fileMenuItems = [
  { id: 'new-workspace', label: '新建工作区', dividerAfter: true },
  { id: 'open', label: '打开' },
  { id: 'save', label: '保存', shortcut: true },
] as const

const viewMenuItems = [
  { id: 'toggle-sidebar', label: '项目栏', shortcut: 'left' },
  { id: 'toggle-right-sidebar', label: '编辑面板', shortcut: 'right' },
] as const

type FileMenuAction = (typeof fileMenuItems)[number]['id']
type ViewMenuAction = (typeof viewMenuItems)[number]['id']
type EditMenuAction = (typeof editMenuItems)[number]['id']

const props = defineProps<{
  saveEnabled: boolean
  undoEnabled: boolean
  sidebarVisible: boolean
  rightSidebarVisible: boolean
}>()

const emit = defineEmits<{
  settingsClick: []
  toggleSidebar: []
  toggleRightSidebar: []
  menuClick: [menu: (typeof navMenuItems)[number]]
  fileAction: [action: FileMenuAction]
  editAction: [action: EditMenuAction]
}>()

const fileMenuOpen = ref(false)
const viewMenuOpen = ref(false)
const editMenuOpen = ref(false)
const fileMenuRef = ref<HTMLElement | null>(null)
const viewMenuRef = ref<HTMLElement | null>(null)
const editMenuRef = ref<HTMLElement | null>(null)
const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent)
const saveShortcutLabel = isMac ? '⌘S' : 'Ctrl+S'
const undoShortcutLabel = isMac ? '⌘Z' : 'Ctrl+Z'
const leftSidebarShortcutLabel = isMac ? '⌘B' : 'Ctrl+B'
const rightSidebarShortcutLabel = isMac ? '⌘⇧B' : 'Ctrl+Shift+B'

const shortcutBadgeClass =
  'rounded border border-app-border bg-app px-1 py-0.5 text-[10px] font-normal leading-none text-app-subtle'

function shortcutLabelForViewItem(shortcut: 'left' | 'right'): string {
  return shortcut === 'left' ? leftSidebarShortcutLabel : rightSidebarShortcutLabel
}

function isViewItemChecked(id: ViewMenuAction): boolean {
  return id === 'toggle-sidebar' ? props.sidebarVisible : props.rightSidebarVisible
}

function closeAllMenus() {
  fileMenuOpen.value = false
  viewMenuOpen.value = false
  editMenuOpen.value = false
}

function toggleFileMenu() {
  viewMenuOpen.value = false
  editMenuOpen.value = false
  fileMenuOpen.value = !fileMenuOpen.value
}

function toggleViewMenu() {
  fileMenuOpen.value = false
  editMenuOpen.value = false
  viewMenuOpen.value = !viewMenuOpen.value
}

function toggleEditMenu() {
  fileMenuOpen.value = false
  viewMenuOpen.value = false
  editMenuOpen.value = !editMenuOpen.value
}

function onFileAction(action: FileMenuAction) {
  emit('fileAction', action)
  closeAllMenus()
}

function onViewAction(action: ViewMenuAction) {
  if (action === 'toggle-sidebar') {
    emit('toggleSidebar')
  } else {
    emit('toggleRightSidebar')
  }

  closeAllMenus()
}

function onEditAction(action: EditMenuAction) {
  if (action === 'undo' && !props.undoEnabled) {
    return
  }

  emit('editAction', action)
  closeAllMenus()
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node

  if (fileMenuOpen.value && !fileMenuRef.value?.contains(target)) {
    fileMenuOpen.value = false
  }

  if (viewMenuOpen.value && !viewMenuRef.value?.contains(target)) {
    viewMenuOpen.value = false
  }

  if (editMenuOpen.value && !editMenuRef.value?.contains(target)) {
    editMenuOpen.value = false
  }
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

        <div ref="viewMenuRef" class="relative">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-sm transition-colors"
            :class="
              viewMenuOpen
                ? 'bg-app-accent text-app-foreground'
                : 'text-app-muted hover:bg-app-accent hover:text-app-foreground'
            "
            aria-haspopup="menu"
            :aria-expanded="viewMenuOpen"
            @click.stop="toggleViewMenu"
          >
            视图
          </button>

          <div
            v-if="viewMenuOpen"
            class="absolute left-0 top-full z-50 min-w-44 pt-1"
            role="presentation"
            @pointerdown.stop
          >
            <div
              class="overflow-hidden rounded-lg border border-app-border bg-app-elevated py-1 shadow-lg shadow-black/10"
              role="menu"
            >
              <button
                v-for="item in viewMenuItems"
                :key="item.id"
                type="button"
                class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-app-foreground transition-colors hover:bg-app-accent"
                role="menuitemcheckbox"
                :aria-checked="isViewItemChecked(item.id)"
                @click="onViewAction(item.id)"
              >
                <Check
                  v-if="isViewItemChecked(item.id)"
                  :size="14"
                  :stroke-width="2"
                  class="shrink-0 text-app-muted"
                />
                <span v-else class="inline-block w-3.5 shrink-0" aria-hidden="true" />
                <span>{{ item.label }}</span>
                <span class="ml-auto pl-4 text-xs text-app-subtle">
                  {{ shortcutLabelForViewItem(item.shortcut) }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div ref="editMenuRef" class="relative">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-sm transition-colors"
            :class="
              editMenuOpen
                ? 'bg-app-accent text-app-foreground'
                : 'text-app-muted hover:bg-app-accent hover:text-app-foreground'
            "
            aria-haspopup="menu"
            :aria-expanded="editMenuOpen"
            @click.stop="toggleEditMenu"
          >
            编辑
          </button>

          <div
            v-if="editMenuOpen"
            class="absolute left-0 top-full z-50 min-w-40 pt-1"
            role="presentation"
            @pointerdown.stop
          >
            <div
              class="overflow-hidden rounded-lg border border-app-border bg-app-elevated py-1 shadow-lg shadow-black/10"
              role="menu"
            >
              <button
                v-for="item in editMenuItems"
                :key="item.id"
                type="button"
                class="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors"
                :class="
                  item.id === 'undo' && !props.undoEnabled
                    ? 'cursor-not-allowed text-app-subtle'
                    : 'text-app-foreground hover:bg-app-accent'
                "
                role="menuitem"
                :aria-disabled="item.id === 'undo' && !props.undoEnabled"
                @click="onEditAction(item.id)"
              >
                <span>{{ item.label }}</span>
                <span
                  v-if="'shortcut' in item && item.shortcut"
                  class="ml-auto pl-4 text-xs text-app-subtle"
                >
                  {{ undoShortcutLabel }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <button
          v-for="menu in navMenuItems"
          :key="menu"
          type="button"
          class="rounded-md px-2.5 py-1 text-sm text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
          @click="emit('menuClick', menu)"
        >
          {{ menu }}
        </button>
      </div>
    </nav>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
        :aria-label="props.sidebarVisible ? '隐藏侧边栏' : '显示侧边栏'"
        :aria-pressed="props.sidebarVisible"
        @click="emit('toggleSidebar')"
      >
        <PanelLeftClose v-if="props.sidebarVisible" :size="16" :stroke-width="1.75" />
        <PanelLeft v-else :size="16" :stroke-width="1.75" />
        <kbd :class="shortcutBadgeClass">{{ leftSidebarShortcutLabel }}</kbd>
      </button>

      <button
        type="button"
        class="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
        :aria-label="props.rightSidebarVisible ? '隐藏编辑面板' : '显示编辑面板'"
        :aria-pressed="props.rightSidebarVisible"
        @click="emit('toggleRightSidebar')"
      >
        <PanelRightClose v-if="props.rightSidebarVisible" :size="16" :stroke-width="1.75" />
        <PanelRight v-else :size="16" :stroke-width="1.75" />
        <kbd :class="shortcutBadgeClass">{{ rightSidebarShortcutLabel }}</kbd>
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
