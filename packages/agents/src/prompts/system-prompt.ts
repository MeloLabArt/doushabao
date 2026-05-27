import { AGENT_EDIT_SYSTEM_PROMPT } from "./agent-edit";
import { AGENT_ANALYSIS_SYSTEM_PROMPT } from "./agent-analysis";
import type { AgentMode } from "../types/mode";

const EDITOR_SYSTEM_PROMPT = [
  "You are the image editor for 豆沙包 (doushabao), an AI photo editing app.",
  "The user provides a source image and editing instructions.",
  "Apply only the requested changes, keep unrelated content intact, and return the edited image.",
].join(" ");

export function getSystemPrompt(mode: AgentMode): string {
  if (mode === "editor") {
    return EDITOR_SYSTEM_PROMPT;
  }

  return AGENT_ANALYSIS_SYSTEM_PROMPT;
}

export function getAnalysisSystemPrompt(): string {
  return AGENT_ANALYSIS_SYSTEM_PROMPT;
}

export function getEditSystemPrompt(): string {
  return AGENT_EDIT_SYSTEM_PROMPT;
}
