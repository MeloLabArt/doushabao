<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  initialName: string
  errorMessage?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  confirm: [name: string]
  cancel: []
}>()

const name = ref('')
const validationError = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const inputClass =
  'w-full rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-foreground outline-none transition placeholder:text-app-subtle focus:border-app-muted focus:ring-2 focus:ring-app-accent'

watch(
  () => [props.open, props.initialName] as const,
  async ([isOpen, initialName]) => {
    if (!isOpen) {
      return
    }

    name.value = initialName
    validationError.value = ''
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  },
)

function readName(): string {
  return (inputRef.value?.value ?? name.value).trim()
}

function handleSubmit(): void {
  if (props.saving) {
    return
  }

  validationError.value = ''

  const trimmed = readName()
  if (!trimmed) {
    validationError.value = '请输入工作区名称'
    inputRef.value?.focus()
    return
  }

  name.value = trimmed
  emit('confirm', trimmed)
}

function handleCancel(): void {
  emit('cancel')
}

function onBackdropClick(): void {
  handleCancel()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      @click.self="onBackdropClick"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-workspace-title"
        class="w-full max-w-sm rounded-xl border border-app-border bg-app-elevated p-5 shadow-xl shadow-black/10"
      >
        <h2 id="save-workspace-title" class="text-base font-semibold text-app-foreground">
          保存工作区
        </h2>
        <p class="mt-1 text-sm text-app-muted">为当前工作区输入一个名称。</p>

        <div class="mt-4 space-y-4">
          <label class="block space-y-1.5">
            <span class="text-sm font-medium text-app-foreground">名称</span>
            <input
              ref="inputRef"
              v-model="name"
              type="text"
              autocomplete="off"
              placeholder="例如：产品海报"
              :class="inputClass"
              @input="validationError = ''"
              @keydown.enter.prevent="handleSubmit"
            />
            <p v-if="validationError" class="text-xs text-red-600 dark:text-red-400">
              {{ validationError }}
            </p>
            <p v-else-if="errorMessage" class="text-xs text-red-600 dark:text-red-400">
              {{ errorMessage }}
            </p>
          </label>

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              type="button"
              class="rounded-lg bg-app-primary px-4 py-2 text-sm font-medium text-app-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="props.saving"
              @click="handleSubmit"
            >
              {{ props.saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
