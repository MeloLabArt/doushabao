import { runAgent, type AgentRunProgress, type AgentRunResult } from '@doushabao/core'

import { translate } from '@/i18n'

import { validateRunConfig } from '@/lib/app-settings'
import { loadAppSettings } from '@/lib/config-storage'
import { hydrateWorkspaceImage } from '@/lib/workspace-storage'
import type { ModelSelection } from '@/types/app-settings'
import type { Workspace } from '@/types/workspace'

export async function runWorkspaceAgent(
  workspace: Workspace,
  prompt: string,
  options?: {
    onProgress?: (step: AgentRunProgress) => void
    modelSelection?: ModelSelection
  },
): Promise<AgentRunResult> {
  const settings = loadAppSettings()
  const config = await validateRunConfig(settings, options?.modelSelection)

  const hydrated = await hydrateWorkspaceImage(workspace)

  if (!hydrated.sourceImage) {
    throw new Error(translate('errors.uploadImageFirst'))
  }

  return runAgent(config, [{ content: prompt, image: hydrated.sourceImage }], [{ style: '' }], {
    onProgress: options?.onProgress,
  })
}
