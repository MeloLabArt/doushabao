import { getSystemPrompt } from "@doushabao/agents";
import { InitConfig } from "./config";
import { InputContent } from "./input";
import { buildMessages, createOpenRouterClient } from "./openrouter/client";
import {
  buildImageConfigForDimensions,
  readImageDimensions,
  resizeImageToDimensions,
} from "./openrouter/image-dimensions";
import { prepareImageForApi } from "./openrouter/prepare-image-for-api";
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
  const sourceContent = validatedContents[0];

  if (!sourceContent) {
    throw new Error("Contents is invalid");
  }

  const sourceDimensions = await readImageDimensions(sourceContent.image);
  const apiImage = await prepareImageForApi(sourceContent.image);
  const apiContents: Content[] = [{ ...sourceContent, image: apiImage }];
  const client = createOpenRouterClient(validatedConfig);
  const messages = buildMessages(apiContents, validatedStyles, resolveSystemPrompt(options), {
    imageFirst: true,
    imageDetail: "high",
  });
  const result = await client.generateImage(validatedConfig.editModel, messages, {
    ...options,
    imageConfig: {
      ...buildImageConfigForDimensions(sourceDimensions),
      ...options.imageConfig,
    },
  });

  const generatedImage = result.images[0];
  if (!generatedImage) {
    return result;
  }

  return {
    ...result,
    images: [await resizeImageToDimensions(generatedImage, sourceDimensions)],
  };
}
