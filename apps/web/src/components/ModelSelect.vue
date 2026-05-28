<script setup lang="ts">
import { computed } from 'vue'

import { formatModelLabel } from '@/lib/app-settings'
import type { AppSettings, ModelEntry } from '@/types/app-settings'

const props = defineProps<{
  settings: AppSettings
  models: ModelEntry[]
  modelValue: string
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectClass =
  'w-full rounded-lg border border-app-border bg-app-input px-3 py-2 text-sm text-app-foreground outline-none transition focus:border-app-muted focus:ring-2 focus:ring-app-accent disabled:cursor-not-allowed disabled:opacity-50'

const options = computed(() =>
  props.models.map((model) => ({
    value: model.id,
    label: formatModelLabel(props.settings, model),
  })),
)
</script>

<template>
  <select
    :value="modelValue"
    :disabled="disabled || models.length === 0"
    :class="selectClass"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="" disabled>
      {{ models.length === 0 ? '请先在设置中添加模型' : (placeholder ?? '选择模型') }}
    </option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
