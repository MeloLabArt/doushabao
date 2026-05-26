import { Config } from "./types/config";

export async function InitConfig(config: Config) {
  const { host, key, model } = config;
  if (!host || !key || !model) {
    throw new Error("Config is invalid");
  }
  return { host, key, model };
}
