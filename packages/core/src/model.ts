import { InitConfig } from "./config";
import { InputContent } from "./input";
import { buildMessages, createOpenRouterClient } from "./openrouter/client";
import { Config } from "./types/config";
import { Content, ContentStyle } from "./types/content";
import { GenerateOptions, GenerateResult } from "./types/openrouter";

export async function generateImage(
  config: Config,
  contents: Content[],
  styles: ContentStyle[],
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const validatedConfig = await InitConfig(config);
  const { contents: validatedContents, styles: validatedStyles } = await InputContent(contents, styles);

  const client = createOpenRouterClient(validatedConfig);
  const messages = buildMessages(validatedContents, validatedStyles, options.systemPrompt);

  return client.generate(messages, options);
}
