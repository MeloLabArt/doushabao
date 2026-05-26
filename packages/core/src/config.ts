import { Config } from "./types/config";

export async function InitConfig(config: Config) {
  const { host, key, model } = config;
  if (!host || !key || !model) {
    throw new Error("Config is invalid");
  }
  if (host.includes("http")) {
    throw new Error("Host must be a valid URL");
  }
  if (key.length !== 32) {
    throw new Error("Key must be 32 characters long");
  }
  if (model.length !== 32) {
    throw new Error("Model must be 32 characters long");
  }
}
