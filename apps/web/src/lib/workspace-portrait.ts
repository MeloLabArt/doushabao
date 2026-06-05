import { ref } from 'vue'
import type { Workspace } from '@/types/workspace'

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

// ── Snapshot for persistence & undo ────────────────────────────────

interface PortraitSnapshot {
  assets: PortraitAsset[]
  clips: PortraitClip[]
}

// ── State ──────────────────────────────────────────────────────────

/** Per-workspace portrait assets (uploaded images). */
const workspacePortraitAssets = ref<Record<string, PortraitAsset[]>>({})

/** Per-workspace timeline clips. */
const workspacePortraitClips = ref<Record<string, PortraitClip[]>>({})

/** Per-workspace undo stacks. */
const workspacePortraitHistory = ref<Record<string, PortraitSnapshot[]>>({})

/** Revision counter for reactivity. */
export const workspacePortraitRevision = ref(0)

// ── Persistence: sync to/from workspace metadata ───────────────────

/**
 * Serialize portrait data to a JSON string for storage in workspace metadata.
 */
function serializePortraitData(workspaceId: string): string | null {
  const assets = workspacePortraitAssets.value[workspaceId]
  const clips = workspacePortraitClips.value[workspaceId]
  if ((!assets || assets.length === 0) && (!clips || clips.length === 0)) return null
  return JSON.stringify({
    assets,
    clips,
  })
}

/**
 * Copy current in-memory portrait state into a Workspace object
 * so it gets saved to the backend as part of the workspace metadata.
 */
export function syncPortraitDataToWorkspace(workspaceId: string, workspace: Workspace): Workspace {
  const serialized = serializePortraitData(workspaceId)
  if (!serialized) {
    const { portraitData: _pd, ...rest } = workspace
    return rest as Workspace
  }
  return {
    ...workspace,
    portraitData: serialized,
  }
}

/**
 * Restore in-memory portrait state from a loaded Workspace object.
 */
export function restorePortraitDataFromWorkspace(workspace: Workspace): void {
  if (!workspace.portraitData) return
  try {
    const data = JSON.parse(workspace.portraitData) as { assets: PortraitAsset[]; clips: PortraitClip[] }
    if (data.assets) {
      workspacePortraitAssets.value = {
        ...workspacePortraitAssets.value,
        [workspace.id]: data.assets,
      }
    }
    if (data.clips) {
      workspacePortraitClips.value = {
        ...workspacePortraitClips.value,
        [workspace.id]: data.clips,
      }
    }
    workspacePortraitRevision.value++
  } catch {
    // Invalid portrait data — ignore
  }
}

// ── Undo ───────────────────────────────────────────────────────────

function takeSnapshot(workspaceId: string): PortraitSnapshot {
  return {
    assets: [...(workspacePortraitAssets.value[workspaceId] ?? [])],
    clips: [...(workspacePortraitClips.value[workspaceId] ?? [])],
  }
}

function recordPortraitHistory(workspaceId: string): void {
  const history = workspacePortraitHistory.value[workspaceId] ?? []
  const snapshot = takeSnapshot(workspaceId)
  // Cap history at 50 entries
  workspacePortraitHistory.value = {
    ...workspacePortraitHistory.value,
    [workspaceId]: [...history.slice(-49), snapshot],
  }
}

export function undoPortraitChange(workspaceId: string): boolean {
  const history = workspacePortraitHistory.value[workspaceId]
  if (!history || history.length === 0) return false

  const prev = history.pop()!
  workspacePortraitHistory.value = {
    ...workspacePortraitHistory.value,
    [workspaceId]: history,
  }

  workspacePortraitAssets.value = {
    ...workspacePortraitAssets.value,
    [workspaceId]: prev.assets,
  }
  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: prev.clips,
  }
  workspacePortraitRevision.value++
  return true
}

export function canUndoPortraitChange(workspaceId: string): boolean {
  const history = workspacePortraitHistory.value[workspaceId]
  return !!history && history.length > 0
}

export function clearPortraitHistory(workspaceId: string): void {
  const next = { ...workspacePortraitHistory.value }
  delete next[workspaceId]
  workspacePortraitHistory.value = next
}

// ── Asset helpers ──────────────────────────────────────────────────

export function getPortraitAssets(workspaceId: string): PortraitAsset[] {
  return workspacePortraitAssets.value[workspaceId] ?? []
}

export function addPortraitAsset(
  workspaceId: string,
  name: string,
  imageDataUrl: string,
): PortraitAsset {
  recordPortraitHistory(workspaceId)
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

  recordPortraitHistory(workspaceId)

  workspacePortraitAssets.value = {
    ...workspacePortraitAssets.value,
    [workspaceId]: assets.filter((a) => a.id !== assetId),
  }

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
  recordPortraitHistory(workspaceId)
  const clips = workspacePortraitClips.value[workspaceId] ?? []
  const clip: PortraitClip = {
    id: crypto.randomUUID(),
    assetId: asset.id,
    assetName: asset.name,
    imageDataUrl: asset.imageDataUrl,
    startTime: 0,
    endTime: 5,
  }
  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: [...clips, clip],
  }
  workspacePortraitRevision.value++
  return clip
}

export function updatePortraitClip(
  workspaceId: string,
  clipId: string,
  updates: Partial<PortraitClip>,
): void {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return

  recordPortraitHistory(workspaceId)

  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
  }
  workspacePortraitRevision.value++
}

export function removePortraitClip(workspaceId: string, clipId: string): void {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return

  recordPortraitHistory(workspaceId)

  workspacePortraitClips.value = {
    ...workspacePortraitClips.value,
    [workspaceId]: clips.filter((c) => c.id !== clipId),
  }
  workspacePortraitRevision.value++
}

/**
 * Split a clip at a given time into two clips.
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

  recordPortraitHistory(workspaceId)

  const updatedClip: PortraitClip = { ...clip, endTime: splitTime }

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

/**
 * Copy a clip — duplicating it right after the original.
 */
export function copyPortraitClip(workspaceId: string, clipId: string): PortraitClip | null {
  const clips = workspacePortraitClips.value[workspaceId]
  if (!clips) return null

  const clip = clips.find((c) => c.id === clipId)
  if (!clip) return null

  recordPortraitHistory(workspaceId)

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
  const nextHistory = { ...workspacePortraitHistory.value }
  delete nextAssets[workspaceId]
  delete nextClips[workspaceId]
  delete nextHistory[workspaceId]
  workspacePortraitAssets.value = nextAssets
  workspacePortraitClips.value = nextClips
  workspacePortraitHistory.value = nextHistory
  workspacePortraitRevision.value++
}
