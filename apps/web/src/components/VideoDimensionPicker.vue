<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  confirm: [width: number, height: number]
  cancel: []
}>()

const PRESETS: { label: string; aspect: string; width: number; height: number }[] = [
  { label: '16:9', aspect: '16:9', width: 1920, height: 1080 },
  { label: '9:16', aspect: '9:16', width: 1080, height: 1920 },
  { label: '1:1', aspect: '1:1', width: 1080, height: 1080 },
  { label: '4:3', aspect: '4:3', width: 1440, height: 1080 },
  { label: '3:4', aspect: '3:4', width: 1080, height: 1440 },
  { label: '21:9', aspect: '21:9', width: 2560, height: 1080 },
]

const isCustom = ref(false)
const customWidth = ref(1920)
const customHeight = ref(1080)
const selectedIndex = ref(0)
const validationError = ref('')

const preset = (index: number) => PRESETS[index]

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    isCustom.value = false
    selectedIndex.value = 0
    customWidth.value = 1920
    customHeight.value = 1080
    validationError.value = ''
    await nextTick()
  },
)

function selectPreset(index: number): void {
  isCustom.value = false
  selectedIndex.value = index
  validationError.value = ''
}

function selectCustom(): void {
  isCustom.value = true
  validationError.value = ''
}

function handleSubmit(): void {
  let w: number
  let h: number

  if (isCustom.value) {
    w = customWidth.value
    h = customHeight.value
  } else {
    w = preset(selectedIndex.value).width
    h = preset(selectedIndex.value).height
  }

  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    validationError.value = 'Invalid dimensions'
    return
  }

  // Clamp to sane limits
  w = Math.min(Math.max(w, 16), 7680)
  h = Math.min(Math.max(h, 16), 7680)

  emit('confirm', w, h)
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
        aria-labelledby="video-dimension-title"
        class="w-full max-w-sm rounded-xl border border-app-border bg-app-elevated p-5 shadow-xl shadow-black/10"
      >
        <h2 id="video-dimension-title" class="text-base font-semibold text-app-foreground">
          {{ t('videoDimension.title') }}
        </h2>
        <p class="mt-1 text-sm text-app-muted">{{ t('videoDimension.description') }}</p>

        <div class="mt-4 space-y-4">
          <!-- Presets -->
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-app-muted">
              {{ t('videoDimension.presets') }}
            </p>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="(p, i) in PRESETS"
                :key="p.label"
                type="button"
                class="flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors"
                :class="
                  !isCustom && selectedIndex === i
                    ? 'border-app-accent bg-app-accent text-app-foreground'
                    : 'border-app-border text-app-muted hover:border-app-accent hover:text-app-foreground'
                "
                @click="selectPreset(i)"
              >
                <span class="text-sm font-semibold">{{ p.label }}</span>
                <span>{{ p.width }}×{{ p.height }}</span>
              </button>
            </div>
          </div>

          <!-- Custom -->
          <div>
            <button
              type="button"
              class="flex items-center gap-2 text-sm transition-colors"
              :class="
                isCustom
                  ? 'font-semibold text-app-foreground'
                  : 'text-app-muted hover:text-app-foreground'
              "
              @click="selectCustom"
            >
              <span
                class="inline-flex size-4 items-center justify-center rounded-full border text-xs"
                :class="
                  isCustom
                    ? 'border-app-accent bg-app-accent text-app-foreground'
                    : 'border-app-border'
                "
              >
                <span v-if="isCustom" class="leading-none">✓</span>
              </span>
              {{ t('videoDimension.custom') }}
            </button>

            <div
              v-if="isCustom"
              class="mt-2 flex items-center gap-3"
            >
              <label class="flex flex-1 flex-col gap-1">
                <span class="text-xs text-app-muted">{{ t('videoDimension.width') }}</span>
                <div class="relative">
                  <input
                    v-model.number="customWidth"
                    type="number"
                    min="16"
                    max="7680"
                    class="app-field pr-8"
                    @input="validationError = ''"
                  />
                  <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-app-muted">{{ t('videoDimension.px') }}</span>
                </div>
              </label>
              <span class="mt-5 text-sm text-app-muted">×</span>
              <label class="flex flex-1 flex-col gap-1">
                <span class="text-xs text-app-muted">{{ t('videoDimension.height') }}</span>
                <div class="relative">
                  <input
                    v-model.number="customHeight"
                    type="number"
                    min="16"
                    max="7680"
                    class="app-field pr-8"
                    @input="validationError = ''"
                  />
                  <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-app-muted">{{ t('videoDimension.px') }}</span>
                </div>
              </label>
            </div>
          </div>

          <p v-if="validationError" class="text-xs text-red-600 dark:text-red-400">
            {{ validationError }}
          </p>

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm text-app-muted transition-colors hover:bg-app-accent hover:text-app-foreground"
              @click="handleCancel"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="app-btn-primary px-4"
              @click="handleSubmit"
            >
              {{ t('videoDimension.create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
