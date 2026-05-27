import { getSystemPrompt } from "@doushabao/agents";
import { InitConfig } from "./config";
import { InputContent } from "./input";
import { buildMessages, createOpenRouterClient } from "./openrouter/client";
import { Config } from "./types/config";
import { Content, ContentStyle } from "./types/content";
import { GenerateOptions, GenerateResult } from "./types/openrouter";

function resolveSystemPrompt(options: GenerateOptions): string {
  if (options.systemPrompt) {
    return options.systemPrompt;
  }

  return getSystemPrompt(options.mode ?? "editor");
}

export async function generateImage(
  config: Config,
  contents: Content[],
  styles: ContentStyle[],
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const validatedConfig = await InitConfig(config);
  const { contents: validatedContents, styles: validatedStyles } = await InputContent(contents, styles);

  const client = createOpenRouterClient(validatedConfig);
  const messages = buildMessages(validatedContents, validatedStyles, resolveSystemPrompt(options));

  return client.generate(validatedConfig.editModel, messages, options);
}
