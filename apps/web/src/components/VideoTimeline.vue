<script setup lang="ts">
import { computed, ref } from 'vue'
import { Play, Pause, Scissors } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    duration?: number
    currentTime?: number
  }>(),
  {
    duration: 10,
    currentTime: 0,
  },
)

const emit = defineEmits<{
  'update:currentTime': [time: number]
}>()

const isPlaying = ref(false)
const timelineRef = ref<HTMLDivElement | null>(null)

const TIME_SCALE = 80 // pixels per second

const totalWidth = computed(() => Math.max(props.duration * TIME_SCALE, 200))

const playheadPosition = computed(() => {
  if (props.duration <= 0) return 0
  return (props.currentTime / props.duration) * totalWidth.value
})

const timeMarkers = computed(() => {
  const markers: { time: number; label: string }[] = []
  const step = getMarkerStep(props.duration)
  for (let t = 0; t <= props.duration; t += step) {
    markers.push({
      time: t,
      label: formatTime(t),
    })
  }
  return markers
})

function getMarkerStep(duration: number): number {
  if (duration <= 5) return 1
  if (duration <= 30) return 5
  if (duration <= 60) return 10
  return 30
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function togglePlay(): void {
  isPlaying.value = !isPlaying.value
}

function handleTimelineClick(event: MouseEvent): void {
  const el = timelineRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, x / totalWidth.value))
  const time = ratio * props.duration
  emit('update:currentTime', time)
}

function handleTimelineDrag(event: PointerEvent): void {
  const el = timelineRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(event.clientX - rect.left, totalWidth.value))
  const ratio = x / totalWidth.value
  const time = ratio * props.duration
  emit('update:currentTime', time)
}
</script>

<template>
  <div class="flex h-20 shrink-0 items-center border-t border-app-border bg-app px-3">
    <!-- Transport controls -->
    <div class="mr-3 flex items-center gap-1.5">
      <button
        type="button"
        class="inline-flex size-7 items-center justify-center rounded-md text-app-muted transition hover:bg-app-accent hover:text-app-foreground"
        :title="isPlaying ? t('timeline.pause') : t('timeline.play')"
        :aria-label="isPlaying ? t('timeline.pause') : t('timeline.play')"
        @click="togglePlay"
      >
        <Play v-if="!isPlaying" :size="14" :stroke-width="1.75" />
        <Pause v-else :size="14" :stroke-width="1.75" />
      </button>
      <button
        type="button"
        class="inline-flex size-7 items-center justify-center rounded-md text-app-muted transition hover:bg-app-accent hover:text-app-foreground"
        :title="t('timeline.split')"
        :aria-label="t('timeline.split')"
      >
        <Scissors :size="14" :stroke-width="1.75" />
      </button>
    </div>

    <!-- Timeline track -->
    <div
      ref="timelineRef"
      class="relative h-full flex-1 cursor-pointer overflow-hidden py-3"
      @click="handleTimelineClick"
      @pointerdown="handleTimelineDrag"
    >
      <div class="relative h-full" :style="{ width: totalWidth + 'px' }">
        <!-- Time ruler -->
        <div class="absolute inset-x-0 top-0 flex">
          <div
            v-for="marker in timeMarkers"
            :key="marker.time"
            class="absolute top-0 flex flex-col items-start"
            :style="{ left: (marker.time / duration) * 100 + '%' }"
          >
            <div class="h-2 w-px bg-app-muted" />
            <span class="mt-0.5 text-[10px] leading-none text-app-subtle">
              {{ marker.label }}
            </span>
          </div>
        </div>

        <!-- Track area -->
        <div class="absolute inset-x-0 bottom-0 h-6 rounded bg-app-surface">
          <div
            class="h-full rounded bg-app-muted/20"
            :style="{ width: (currentTime / duration) * 100 + '%' }"
          />
        </div>

        <!-- Playhead -->
        <div
          class="absolute top-0 bottom-0 flex flex-col items-center"
          :style="{ left: playheadPosition + 'px' }"
        >
          <div class="size-2.5 rounded-full border-2 border-app-accent bg-app" />
          <div class="mx-auto w-0.5 flex-1 bg-app-accent" />
        </div>
      </div>
    </div>

    <!-- Time display -->
    <div class="ml-3 shrink-0 text-[11px] tabular-nums text-app-muted">
      {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
    </div>
  </div>
</template>
