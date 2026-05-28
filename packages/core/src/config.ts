import { Config, type ModelEndpoint } from "./types/config";

function validateEndpoint(endpoint: ModelEndpoint, label: string): ModelEndpoint {
  const host = endpoint.host.trim();
  const key = endpoint.key.trim();
  const model = endpoint.model.trim();

  if (!host || !key || !model) {
    throw new Error(`${label} 配置不完整`);
  }

  return { host, key, model };
}

export async function InitConfig(config: Config): Promise<Config> {
  const analysis = validateEndpoint(config.analysis, "分析");
  const edit = validateEndpoint(config.edit, "修图");

  if (analysis.model === edit.model && analysis.host === edit.host) {
    throw new Error("分析模型与修图模型不能相同，修图模型需支持图像输出");
  }

  return { analysis, edit };
}
