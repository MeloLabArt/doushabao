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
    "【任务】对消息中附带的输入图做编辑并输出编辑后的同一张图，不是根据文字另画一张相似的新图。",
    "输入图是待修底片：人物身份、五官、发型、衣着、物体种类与数量、构图、透视、背景结构必须与输入图一致。",
    "禁止整图重绘、禁止换脸、禁止替换场景或季节；仅做指令范围内的极轻微摄影后期。",
    "",
    "修图指令：",
    analysis.editPrompt.trim(),
    "",
    `【尺寸硬性要求】输出图片必须为宽 ${dimensions.width} × 高 ${dimensions.height} 像素（与原图完全相同）。禁止裁切、加边、拉伸、压缩或任何导致宽高比/分辨率变化的处理。`,
    "若指令与保真冲突，以保真原图为准并尽量少改。",
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
