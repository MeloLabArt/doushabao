import { Config } from "./types/config";

export async function InitConfig(config: Config) {
  const { host, key, analysisModel, editModel } = config;
  if (!host || !key || !analysisModel || !editModel) {
    throw new Error("Config is invalid");
  }
  return { host, key, analysisModel, editModel };
}
