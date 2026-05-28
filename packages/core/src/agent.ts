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
    "[Task] Edit the attached input image and return the edited same image—not a new similar image painted from text alone.",
    "The input is the plate: person identity, features, hair, clothing, object types and counts, composition, perspective, and background structure must match the input.",
    "No full redraw, no face swap, no scene or season replacement; only minimal photo post within the instructions.",
    "",
    "Edit instructions:",
    analysis.editPrompt.trim(),
    "",
    `[Dimension requirement] Output must be exactly ${dimensions.width} × ${dimensions.height} pixels (identical to the original). No crop, border, stretch, compress, or any aspect ratio or resolution change.`,
    "If instructions conflict with fidelity, prioritize fidelity and change as little as possible.",
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

  const editMessages = buildMessages(editContents, validatedStyles, getEditSystemPrompt(), {
    imageFirst: true,
    imageDetail: "high",
  });
  let editResult;
  try {
    editResult = await client.generateImage(validatedConfig.editModel, editMessages, {
      imageConfig: {
        ...buildImageConfigForDimensions(sourceDimensions),
        ...options.imageConfig,
      },
      ...(options.modalities ? { modalities: options.modalities } : {}),
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
