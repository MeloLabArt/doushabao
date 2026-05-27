import {
  getAnalysisSystemPrompt,
  getEditSystemPrompt,
  parseAgentAnalysis,
  type AgentImageAnalysis,
} from "@doushabao/agents";
import { InitConfig } from "./config";
import { InputContent } from "./input";
import { buildMessages, createOpenRouterClient } from "./openrouter/client";
import { readImageDimensions, resizeImageToDimensions, type ImageDimensions } from "./openrouter/image-dimensions";
import { prepareImageForApi } from "./openrouter/prepare-image-for-api";
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
    "【任务】在原图底片上做局部摄影后期，禁止整图重绘、禁止改变构图/人物样貌/物体。",
    "",
    "修图指令：",
    analysis.editPrompt.trim(),
    "",
    `尺寸要求：输出必须与原图完全一致，宽 ${dimensions.width} × 高 ${dimensions.height} 像素，不得改变宽高比、画布大小或裁切比例。`,
    "成片应与原图在主体、构图、人物身份上无法区分是否为另一张图，仅允许指令范围内的极轻微差异。",
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
  const apiImage = await prepareImageForApi(sourceContent.image);
  const apiContents: Content[] = [{ ...sourceContent, image: apiImage }];

  options.onProgress?.("analysis");

  const analysisMessages = buildMessages(
    apiContents,
    validatedStyles,
    options.systemPrompt ?? getAnalysisSystemPrompt(),
  );

  let analysisResult;
  try {
    analysisResult = await client.generateText(validatedConfig.analysisModel, analysisMessages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message.startsWith("分析阶段") ? message : `分析阶段：${message}`);
  }

  if (!analysisResult.text) {
    throw new Error("分析模型未返回文本");
  }

  const analysis = parseAgentAnalysis(analysisResult.text);

  options.onProgress?.("edit");

  const editContents: Content[] = [
    {
      content: buildEditPrompt(analysis, sourceDimensions),
      image: apiImage,
    },
  ];

  const editMessages = buildMessages(editContents, validatedStyles, getEditSystemPrompt());
  let editResult;
  try {
    editResult = await client.generateImage(validatedConfig.editModel, editMessages, {
      imageConfig: options.imageConfig,
      modalities: options.modalities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message.startsWith("修图阶段") ? message : `修图阶段：${message}`);
  }

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
