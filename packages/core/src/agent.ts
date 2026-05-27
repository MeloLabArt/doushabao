import {
  getAnalysisSystemPrompt,
  getEditSystemPrompt,
  parseAgentAnalysis,
  type AgentImageAnalysis,
} from "@doushabao/agents";
import { InitConfig } from "./config";
import { InputContent } from "./input";
import { buildMessages, createOpenRouterClient } from "./openrouter/client";
import {
  buildImageConfigForDimensions,
  readImageDimensions,
  resizeImageToDimensions,
  type ImageDimensions,
} from "./openrouter/image-dimensions";
import { Config } from "./types/config";
import { Content, ContentStyle } from "./types/content";
import { GenerateOptions } from "./types/openrouter";

export type AgentRunResult = {
  analysis: AgentImageAnalysis;
  analysisRaw: string;
  images: string[];
  text?: string;
  sourceDimensions: ImageDimensions;
};

function buildEditPrompt(analysis: AgentImageAnalysis, dimensions: ImageDimensions): string {
  return [
    "修图指令：",
    analysis.editPrompt.trim(),
    "",
    `尺寸要求：输出图片必须与原图完全一致，宽 ${dimensions.width} × 高 ${dimensions.height} 像素，不得改变宽高比、画布大小或裁切比例。`,
  ].join("\n");
}

export type AgentRunProgress = "analysis" | "edit";

export type AgentRunOptions = GenerateOptions & {
  onProgress?: (step: AgentRunProgress) => void;
};

export async function runAgent(
  config: Config,
  contents: Content[],
  styles: ContentStyle[],
  options: AgentRunOptions = {},
): Promise<AgentRunResult> {
  const validatedConfig = await InitConfig(config);
  const { contents: validatedContents, styles: validatedStyles } = await InputContent(contents, styles);
  const client = createOpenRouterClient(validatedConfig);
  const sourceContent = validatedContents[0];

  if (!sourceContent) {
    throw new Error("Contents is invalid");
  }

  const sourceDimensions = await readImageDimensions(sourceContent.image);

  options.onProgress?.("analysis");

  const analysisMessages = buildMessages(
    validatedContents,
    validatedStyles,
    options.systemPrompt ?? getAnalysisSystemPrompt(),
  );

  const analysisResult = await client.generateText(validatedConfig.analysisModel, analysisMessages);

  if (!analysisResult.text) {
    throw new Error("Analysis model returned no text");
  }

  const analysis = parseAgentAnalysis(analysisResult.text);

  options.onProgress?.("edit");

  const editContents: Content[] = [
    {
      content: buildEditPrompt(analysis, sourceDimensions),
      image: sourceContent.image,
    },
  ];

  const editMessages = buildMessages(editContents, validatedStyles, getEditSystemPrompt());
  const editResult = await client.generateImage(validatedConfig.editModel, editMessages, {
    imageConfig: {
      ...buildImageConfigForDimensions(sourceDimensions),
      ...options.imageConfig,
    },
    modalities: options.modalities,
  });

  const generatedImage = editResult.images[0];
  if (!generatedImage) {
    throw new Error("修图模型未返回图片");
  }

  const normalizedImage = await resizeImageToDimensions(generatedImage, sourceDimensions);

  return {
    analysis,
    analysisRaw: analysisResult.text,
    images: [normalizedImage],
    text: editResult.text,
    sourceDimensions,
  };
}
