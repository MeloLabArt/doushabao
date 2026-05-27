import {
  getAnalysisSystemPrompt,
  getEditSystemPrompt,
  parseAgentAnalysis,
  type AgentImageAnalysis,
} from "@doushabao/agents";
import { InitConfig } from "./config";
import { InputContent } from "./input";
import { buildMessages, createOpenRouterClient } from "./openrouter/client";
import { Config } from "./types/config";
import { Content, ContentStyle } from "./types/content";
import { GenerateOptions } from "./types/openrouter";

export type AgentRunResult = {
  analysis: AgentImageAnalysis;
  analysisRaw: string;
  images: string[];
  text?: string;
};

function buildEditPrompt(userPrompt: string, analysis: AgentImageAnalysis): string {
  const parts = [
    "图片分析结果：",
    JSON.stringify(analysis, null, 2),
  ];

  if (userPrompt.trim()) {
    parts.push("", "用户修图需求：", userPrompt.trim());
  } else {
    parts.push("", "用户未提供具体修图需求，请根据分析结果自动优化。");
  }

  return parts.join("\n");
}

export async function runAgent(
  config: Config,
  contents: Content[],
  styles: ContentStyle[],
  options: GenerateOptions = {},
): Promise<AgentRunResult> {
  const validatedConfig = await InitConfig(config);
  const { contents: validatedContents, styles: validatedStyles } = await InputContent(contents, styles);
  const client = createOpenRouterClient(validatedConfig);

  const analysisMessages = buildMessages(
    validatedContents,
    validatedStyles,
    options.systemPrompt ?? getAnalysisSystemPrompt(),
  );

  const analysisResult = await client.generate(validatedConfig.analysisModel, analysisMessages, {
    ...options,
    modalities: ["text"],
  });

  if (!analysisResult.text) {
    throw new Error("Analysis model returned no text");
  }

  const analysis = parseAgentAnalysis(analysisResult.text);
  const sourceContent = validatedContents[0];
  if (!sourceContent) {
    throw new Error("Contents is invalid");
  }

  const editContents: Content[] = [
    {
      content: buildEditPrompt(sourceContent.content, analysis),
      image: sourceContent.image,
    },
  ];

  const editMessages = buildMessages(editContents, validatedStyles, getEditSystemPrompt());
  const editResult = await client.generate(validatedConfig.editModel, editMessages, options);

  return {
    analysis,
    analysisRaw: analysisResult.text,
    images: editResult.images,
    text: editResult.text,
  };
}
