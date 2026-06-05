import { ref } from 'vue'

// ── Types ──────────────────────────────────────────────────────────

export interface PortraitAsset {
  id: string
  name: string
  imageDataUrl: string
}

export interface PortraitClip {
  id: string
  assetId: string
  assetName: string
  imageDataUrl: string
  startTime: number
  endTime: number
}

// ── State ──────────────────────────────────────────────────────────

/** Per-workspace portrait assets (uploaded images). */
const workspacePortraitAssets = ref<Record<string, PortraitAsset[]>>({})

/** Per-workspace timeline clips. */
const workspacePortraitClips = ref<Record<string, PortraitClip[]>>({})

/** Revision counter for reactivity. */
export const workspacePortraitRevision = ref(0)

// ── Asset helpers ──────────────────────────────────────────────────

export function getPortraitAssets(workspaceId: string): PortraitAsset[] {
  return workspacePortraitAssets.value[workspaceId] ?? []
}

export function addPortraitAsset(
  workspaceId: string,
  name: string,
  imageDataUrl: string,
): PortraitAsset {
  const assets = workspacePortraitAssets.value[workspaceId] ?? []
  const asset: PortraitAsset = {
    id: crypto.randomUUID(),
    name,
    imageDataUrl,
  }
  workspacePortraitAssets.value = {
    ...workspacePortraitAssets.value,
    [workspaceId]: [...assets, asset],
  }
  workspacePortraitRevision.value++
  return asset
}

export function deletePortraitAsset(workspaceId: string, assetId: string): void {
  const assets = workspacePortraitAssets.value[workspaceId]
  if (!assets) return

  // Remove the asset
  workspacePortraitAssets.value = {
    ...workspacePortraitAssets.value,
    [workspaceId]: assets.filter((a) => a.id !== assetId),
  }

  // Also remove any clips that reference this asset
  const clips = workspacePortraitClips.value[workspaceId]
  if (clips) {
    workspacePortraitClips.value = {
      ...workspacePortraitClips.value,
      [workspaceId]: clips.filter((c) => c.assetId !== assetId),
    }
  }

  workspacePortraitRevision.value++
}

// ── Clip helpers ───────────────────────────────────────────────────

export function getPortraitClips(workspaceId: string): PortraitClip[] {
  return workspacePortraitClips.value[workspaceId] ?? []
}

export function addPortraitClip(workspaceId: string, asset: PortraitAsset): PortraitClip {
  const clips = workspacePortraitClips.value[workspaceId] ?? []
  const clip: PortraitClip = {
    id: crypto.randomUUID(),
    assetId: asset.id,
    assetName: asset.name,
    imageDataUrl: asset.imageDataUrl,
    startTime: 0,
    endTime: 5, // default 5 seconds
  }
  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: [...clips, clip],
  }
  workspacePortraitRevision.value++
  return clip
}

export function addPortraitClipRaw(
  workspaceId: string,
  clip: Omit<PortraitClip, 'id'>,
): PortraitClip {
  const clips = workspacePortraitClips.value[workspaceId] ?? []
  const newClip: PortraitClip = {
    id: crypto.randomUUID(),
    ...clip,
  }
  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: [...clips, newClip],
  }
  workspacePortraitRevision.value++
  return newClip
}

export function updatePortraitClip(
  workspaceId: string,
  clipId: string,
  updates: Partial<PortraitClip>,
): void {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return

  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
  }
  workspacePortraitRevision.value++
}

export function removePortraitClip(workspaceId: string, clipId: string): void {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return

  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: clips.filter((c) => c.id !== clipId),
  }
  workspacePortraitRevision.value++
}

/**
 * Split a clip at a given time into two clips.
 * Returns the new (second half) clip, or null if the split wouldn't produce two valid clips.
 */
export function splitPortraitClip(
  workspaceId: string,
  clipId: string,
  splitTime: number,
): PortraitClip | null {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return null

  const idx = clips.findIndex((c) => c.id === clipId)
  if (idx < 0) return null

  const clip = clips[idx]!
  if (splitTime <= clip.startTime || splitTime >= clip.endTime) return null

  // Shrink the original clip
  const updatedClip: PortraitClip = { ...clip, endTime: splitTime }

  // Create a new clip for the second half
  const newClip: PortraitClip = {
    id: crypto.randomUUID(),
    assetId: clip.assetId,
    assetName: clip.assetName,
    imageDataUrl: clip.imageDataUrl,
    startTime: splitTime,
    endTime: clip.endTime,
  }

  const next = [...clips]
  next[idx] = updatedClip
  next.splice(idx + 1, 0, newClip)

  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: next,
  }
  workspacePortraitRevision.value++
  return newClip
}

// ── Deep copy a clip (creates a new clip with same properties at a new position) ──

export function copyPortraitClip(workspaceId: string, clipId: string): PortraitClip | null {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return null

  const clip = clips.find((c) => c.id === clipId)
  if (!clip) return null

  const offset = clip.endTime - clip.startTime
  const newClip: PortraitClip = {
    ...clip,
    id: crypto.randomUUID(),
    startTime: clip.endTime,
    endTime: clip.endTime + offset,
  }

  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: [...clips, newClip],
  }
  workspacePortraitRevision.value++
  return newClip
}

// ── Cleanup ────────────────────────────────────────────────────────

export function clearPortraitData(workspaceId: string): void {
  const nextAssets = { ...workspacePortraitAssets.value }
  const nextClips = { ...workspacePortraitClips.value }
  delete nextAssets[workspaceId]
  delete nextClips[workspaceId]
  workspacePortraitAssets.value = nextAssets
  workspacePortraitClips.value = nextClips
  workspacePortraitRevision.value++
}
