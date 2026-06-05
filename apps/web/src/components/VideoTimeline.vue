<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Play, Pause, ZoomIn, ZoomOut } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import gsap from 'gsap'
import PortraitTimelineTrack from './PortraitTimelineTrack.vue'
import type { PortraitClip } from '@/lib/workspace-portrait'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    duration?: number
    currentTime?: number
    playing?: boolean
    portraitClips?: PortraitClip[]
    selectedClipId?: string | null
  }>(),
  {
    duration: 0,
    currentTime: 0,
    playing: false,
    portraitClips: () => [],
    selectedClipId: null,
  },
)

const emit = defineEmits<{
  play: []
  pause: []
  seek: [time: number]
  'update:portraitClip': [clipId: string, updates: Partial<PortraitClip>]
  'split:portraitClip': [clipId: string, time: number]
  'copy:portraitClip': [clipId: string]
  'delete:portraitClip': [clipId: string]
  'select:portraitClip': [clipId: string | null]
}>()

const scrollRef = ref<HTMLDivElement | null>(null)
const playheadRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)

const displayDuration = computed(() => Math.max(props.duration, 0))

// ── Zoom ──────────────────────────────────────────────────────

const zoom = ref(90)
const timeScale = computed(() => zoom.value)

const trackWidth = computed(() => {
  if (displayDuration.value <= 0) return 600
  return Math.max(displayDuration.value * timeScale.value, 600)
})

// ── Playhead visual position ──────────────────────────────────
// During playback: follows props.currentTime directly (stable).
// On seek (click): GSAP power2.out tween for a smooth slide.
// During drag: follows drag position directly.
const smoothTime = ref(0)
let seekTween: gsap.core.Tween | null = null

function animateSeek(target: number): void {
  seekTween?.kill()
  seekTween = gsap.to(smoothTime, {
    value: target,
    duration: 0.25,
    ease: 'power2.out',
    onComplete: () => { seekTween = null; smoothTime.value = target },
  })
}

onUnmounted(() => { seekTween?.kill() })

// During playback / seeking: sync smoothTime with the prop.
// The GSAP seek animation has priority — don't overwrite it while running.
watch(() => props.currentTime, (t) => {
  if (!seekTween) smoothTime.value = t
})

// Reset when a new video loads.
watch(() => props.duration, () => { smoothTime.value = 0 })

const playheadPx = computed(() => {
  if (displayDuration.value <= 0) return 0
  return (smoothTime.value / displayDuration.value) * trackWidth.value
})

// ── Ruler ticks ──────────────────────────────────────────────

interface Tick {
  time: number
  label: string
  major: boolean
}

const ticks = computed(() => {
  const dur = displayDuration.value
  if (dur <= 0) return []

  // Determine secondary-tick interval based on zoom
  const scale = timeScale.value
  let minorStep: number
  if (scale >= 300) minorStep = 0.1   // 100 ms
  else if (scale >= 150) minorStep = 0.5  // 500 ms
  else if (scale >= 60) minorStep = 1     // 1 s
  else minorStep = 5                      // 5 s

  // Major tick every 5th minor, or every second if minor < 1
  let majorEvery: number
  if (minorStep >= 1) majorEvery = Math.max(1, Math.round(5 / minorStep)) * Math.ceil(minorStep)
  else majorEvery = 1  // every second is a major tick

  const result: Tick[] = []
  for (let t = 0; t <= dur; t += minorStep) {
    const rounded = Math.round(t * 100) / 100
    result.push({
      time: rounded,
      label: t % majorEvery < minorStep ? formatTime(rounded) : '',
      major: t % majorEvery < minorStep,
    })
  }
  return result
})

// ── Helpers ──────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function handlePlayPause(): void {
  if (props.playing) emit('pause')
  else emit('play')
}

function clientXToTime(clientX: number): number {
  const el = scrollRef.value
  if (!el || displayDuration.value <= 0) return 0
  const rect = el.getBoundingClientRect()
  const x = clientX - rect.left + el.scrollLeft
  return Math.min(Math.max((x / trackWidth.value) * displayDuration.value, 0), displayDuration.value)
}

// ── Interactions ─────────────────────────────────────────────

/** Click on the track → instantly jump playhead there + seek. */
function onTrackClick(event: MouseEvent): void {
  if (isDragging.value) return
  const target = clientXToTime(event.clientX)
  seekTween?.kill()
  seekTween = null
  smoothTime.value = target
  emit('seek', target)
}

/** Start dragging the playhead. */
function onPlayheadPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  isDragging.value = true
  event.preventDefault()
  playheadRef.value?.setPointerCapture(event.pointerId)
}

/** Update while dragging — directly snap playhead, no animation. */
function onPlayheadPointerMove(event: PointerEvent): void {
  if (!isDragging.value) return
  const t = clientXToTime(event.clientX)
  smoothTime.value = t
  emit('seek', t)
}

/** End drag — snap instantly. */
function onPlayheadPointerUp(event: PointerEvent): void {
  if (!isDragging.value) return
  isDragging.value = false
  playheadRef.value?.releasePointerCapture(event.pointerId)
  const target = clientXToTime(event.clientX)
  seekTween?.kill()
  seekTween = null
  smoothTime.value = target
  emit('seek', target)
}

// ── Zoom ─────────────────────────────────────────────────────

function zoomIn(): void {
  zoom.value = Math.min(zoom.value * 1.4, 600)
}

function zoomOut(): void {
  zoom.value = Math.max(zoom.value / 1.4, 30)
}

// ── Portrait track helpers ──────────────────────────────────

const portraitTrackHeight = 28 // px per portrait track

/** Group portrait clips by assetId — each unique asset gets its own track. */
const portraitTracks = computed(() => {
  const map = new Map<string, { assetId: string; assetName: string; clips: PortraitClip[] }>()
  for (const clip of props.portraitClips) {
    let track = map.get(clip.assetId)
    if (!track) {
      track = { assetId: clip.assetId, assetName: clip.assetName, clips: [] }
      map.set(clip.assetId, track)
    }
    track.clips.push(clip)
  }
  return Array.from(map.values())
})

const totalPortraitTrackHeight = computed(() => {
  return portraitTracks.value.length * portraitTrackHeight
})

const timelineContentHeight = computed(() => {
  // Ruler(22) + Video track(96) + Audio track(32) + Portrait tracks + padding
  return 22 + 96 + 32 + totalPortraitTrackHeight.value
})

function handlePortraitUpdate(clipId: string, updates: Partial<PortraitClip>): void {
  emit('update:portraitClip', clipId, updates)
}

function handlePortraitSplit(clipId: string): void {
  // Use the current playhead time as the split point
  emit('split:portraitClip', clipId, props.currentTime)
}

function handlePortraitCopy(clipId: string): void {
  emit('copy:portraitClip', clipId)
}

function handlePortraitDelete(clipId: string): void {
  emit('delete:portraitClip', clipId)
}

function handlePortraitSelect(clipId: string): void {
  emit('select:portraitClip', clipId)
}

// ── Auto-scroll playhead during playback ─────────────────────

function scrollPlayheadIntoView(): void {
  const el = scrollRef.value
  if (!el || displayDuration.value <= 0) return
  const target = playheadPx.value - el.clientWidth * 0.4
  el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth))
}

watch(
  () => props.currentTime,
  () => {
    if (props.playing) scrollPlayheadIntoView()
  },
)
</script>

<template>
  <div class="flex shrink-0 flex-col border-t border-app-border bg-[#1a1a1a]">
    <!-- Toolbar: transport, zoom, time -->
    <div class="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex size-7 items-center justify-center rounded text-white/60 transition hover:bg-white/10 hover:text-white"
          :title="playing ? t('timeline.pause') : t('timeline.play')"
          @click="handlePlayPause"
        >
          <Play v-if="!playing" :size="15" :stroke-width="1.75" />
          <Pause v-else :size="15" :stroke-width="1.75" />
        </button>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title="缩小"
          @click="zoomOut"
        >
          <ZoomOut :size="13" :stroke-width="1.75" />
        </button>
        <button
          type="button"
          class="inline-flex size-6 items-center justify-center rounded text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title="放大"
          @click="zoomIn"
        >
          <ZoomIn :size="13" :stroke-width="1.75" />
        </button>
      </div>

      <div class="text-[11px] tabular-nums text-white/50">
        <span class="font-medium text-white/80">{{ formatTime(currentTime) }}</span>
        <span class="mx-1">/</span>
        <span>{{ formatTime(displayDuration) }}</span>
      </div>
    </div>

    <!-- Scrollable timeline area -->
    <div
      ref="scrollRef"
      class="relative select-none overflow-x-auto overscroll-x-contain scrollbar-thin"
      :style="{ height: Math.max(timelineContentHeight + 16, 132) + 'px', background: '#141414' }"
    >
      <div
        class="relative"
        :style="{ width: trackWidth + 'px', height: timelineContentHeight + 16 + 'px' }"
      >
        <!-- Ruler -->
        <div class="absolute inset-x-0 top-0 z-10" style="height: 22px">
          <div
            v-for="tick in ticks"
            :key="tick.time"
            class="absolute top-0 flex flex-col items-start"
            :style="{ left: (tick.time / displayDuration) * 100 + '%' }"
          >
            <div
              class="shrink-0"
              :class="tick.major ? 'h-3 w-px bg-white/25' : 'h-1.5 w-px bg-white/10'"
            />
            <span
              v-if="tick.label"
              class="mt-0.5 whitespace-nowrap text-[9px] leading-none text-white/35"
            >{{ tick.label }}</span>
          </div>
        </div>

        <!-- Video track row (clickable for seek) -->
        <div
          class="absolute cursor-pointer"
          :style="{ left: '0', top: '22px', right: '0', height: '96px' }"
          @click="onTrackClick"
        >
          <div
            class="absolute inset-y-2 rounded"
            style="left: 0; right: 0; background: linear-gradient(135deg, #2a5a8a, #1e3a5f)"
          />
        </div>

        <!-- Audio track row (clickable for seek) -->
        <div
          class="absolute cursor-pointer"
          :style="{ left: '0', top: '118px', right: '0', height: '32px' }"
          @click="onTrackClick"
        >
          <div class="mt-1 h-6 rounded bg-white/5" />
        </div>

        <!-- Portrait tracks area (each unique asset gets its own track row) -->
        <div
          class="absolute cursor-pointer"
          :style="{ left: '0', top: '150px', right: '0', bottom: '0' }"
          @click="onTrackClick"
        >
          <div
            v-for="(track, idx) in portraitTracks"
            :key="track.assetId"
            class="absolute inset-x-0"
            :style="{ top: idx * portraitTrackHeight + 'px', height: portraitTrackHeight + 'px' }"
          >
            <!-- Track background -->
            <div class="absolute inset-0">
              <div
                class="mx-0.5 mt-0.5 rounded"
                :class="idx % 2 === 0 ? 'bg-white/5' : 'bg-transparent'"
                style="height: 26px"
              />
            </div>

            <!-- Track label (non-interactive overlay) -->
            <div class="pointer-events-none absolute left-1 top-0 z-10 flex h-full max-w-[52px] items-center overflow-hidden">
              <span class="truncate leading-none text-[9px] text-white/40">{{ track.assetName }}</span>
            </div>

            <!-- Clips in this track -->
            <PortraitTimelineTrack
              v-for="clip in track.clips"
              :key="clip.id"
              :clip="clip"
              :duration="displayDuration"
              :time-scale="timeScale"
              :track-width="trackWidth"
              :is-selected="clip.id === selectedClipId"
              @select="handlePortraitSelect"
              @update="handlePortraitUpdate"
              @split="handlePortraitSplit"
              @copy="handlePortraitCopy"
              @delete="handlePortraitDelete"
            />
          </div>
        </div>

        <!-- Playhead (full height) -->
        <div
          v-if="displayDuration > 0"
          ref="playheadRef"
          class="absolute top-0 z-20 flex cursor-grab flex-col items-center"
          :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
          :style="{ left: playheadPx + 'px', height: '100%' }"
          @pointerdown="onPlayheadPointerDown"
          @pointermove="onPlayheadPointerMove"
          @pointerup="onPlayheadPointerUp"
          @pointercancel="onPlayheadPointerUp"
        >
          <!-- Triangle handle -->
          <svg width="10" height="10" viewBox="0 0 10 10" class="shrink-0">
            <polygon points="0,0 10,0 5,10" fill="#f97316" />
          </svg>
          <!-- Vertical line -->
          <div class="w-0.5 flex-1 bg-orange-500 shadow-sm" />
        </div>
      </div>
    </div>
  </div>
</template>
