import type { Router } from 'vue-router'

import { createWorkspaceId } from '@/lib/workspace-id'
import { createDraftWorkspace } from '@/lib/workspace-session'

export function openNewWorkspace(router: Router): void {
  const workspaceId = createWorkspaceId()
  createDraftWorkspace(workspaceId)

  void router.push({
    name: 'workspace',
    params: { workspaceId },
  })
}
