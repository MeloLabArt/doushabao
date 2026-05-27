import type { AgentImageAnalysis } from "./types/analysis";

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export function parseAgentAnalysis(text: string): AgentImageAnalysis {
  const parsed = JSON.parse(stripMarkdownFence(text)) as AgentImageAnalysis;

  if (!parsed.imageType || !parsed.imageTypeReason || !Array.isArray(parsed.deficiencies) || !parsed.summary) {
    throw new Error("Agent analysis JSON is missing required fields");
  }

  return parsed;
}
