import {
  deleteBackendWorkspaceVideo,
  getBackendWorkspaceVideoBlob,
  saveBackendWorkspaceVideoFile,
} from '@/lib/api-client'

/**
 * Upload a raw video Blob/File to the backend.
 * The backend stores it as a raw file (not base64).
 */
export async function saveWorkspaceVideoFile(
  workspaceId: string,
  file: Blob,
): Promise<void> {
  try {
    await saveBackendWorkspaceVideoFile(workspaceId, file)
  } catch {
    // Backend unavailable
  }
}

/**
 * Download the raw video Blob from the backend.
 * Returns null if no video is stored for this workspace.
 * Caller is responsible for URL.createObjectURL / revokeObjectURL.
 */
export async function loadWorkspaceVideoBlob(
  workspaceId: string,
): Promise<Blob | null> {
  try {
    return await getBackendWorkspaceVideoBlob(workspaceId)
  } catch {
    return null
  }
}

/**
 * Delete workspace video from backend.
 */
export async function deleteWorkspaceVideoFile(
  workspaceId: string,
): Promise<void> {
  try {
    await deleteBackendWorkspaceVideo(workspaceId)
  } catch {
    // Backend unavailable
  }
}
