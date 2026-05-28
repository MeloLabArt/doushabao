import { AGENT_EDIT_SYSTEM_PROMPT } from "./agent-edit";
import { AGENT_ANALYSIS_SYSTEM_PROMPT } from "./agent-analysis";
import { EDITOR_EDIT_SYSTEM_PROMPT } from "./editor-edit";
import type { AgentMode } from "../types/mode";

export function getSystemPrompt(mode: AgentMode): string {
  if (mode === "editor") {
    return EDITOR_EDIT_SYSTEM_PROMPT;
  }

  return AGENT_ANALYSIS_SYSTEM_PROMPT;
}

export function getAnalysisSystemPrompt(): string {
  return AGENT_ANALYSIS_SYSTEM_PROMPT;
}

export function getEditSystemPrompt(): string {
  return AGENT_EDIT_SYSTEM_PROMPT;
}

export function getEditorSystemPrompt(): string {
  return EDITOR_EDIT_SYSTEM_PROMPT;
}
