import { runAgent, type AgentRunProgress, type AgentRunResult, type Config } from '@doushabao/core'

import { loadConfig } from '@/lib/config-storage'
import { hydrateWorkspaceImage } from '@/lib/workspace-storage'
import type { Workspace } from '@/types/workspace'

function validateAgentConfig(config: Config): string | null {
  if (!config.key.trim()) {
    return '请先在设置中配置 API Key'
  }

  if (!config.analysisModel.trim()) {
    return '请先在设置中配置分析模型'
  }

  if (!config.editModel.trim()) {
    return '请先在设置中配置修图模型'
  }

  if (config.analysisModel.trim() === config.editModel.trim()) {
    return '分析模型与修图模型不能相同，修图模型需支持图像输出'
  }

  return null
}

export async function runWorkspaceAgent(
  workspace: Workspace,
  prompt: string,
  onProgress?: (step: AgentRunProgress) => void,
): Promise<AgentRunResult> {
  const config = loadConfig()
  const configError = validateAgentConfig(config)

  if (configError) {
    throw new Error(configError)
  }

  const hydrated = await hydrateWorkspaceImage(workspace)

  if (!hydrated.sourceImage) {
    throw new Error('请先上传图片')
  }

  return runAgent(config, [{ content: prompt, image: hydrated.sourceImage }], [{ style: '' }], {
    onProgress,
  })
}
