import { Content, ContentStyle } from "../types/content";
import { ChatMessage } from "../types/openrouter";
import { normalizeImageUrl } from "./normalize-image-url";

export type BuildMessagesOptions = {
  /** 修图时先传图再传文字，降低模型把任务当成「文生图」的概率 */
  imageFirst?: boolean;
  imageDetail?: "auto" | "low" | "high";
};

function buildPrompt(content: Content, style?: ContentStyle): string {
  const parts: string[] = [];

  if (style?.style) {
    parts.push(`Style: ${style.style}`);
  }

  if (content.content) {
    parts.push(content.content);
  }

  return parts.join("\n\n");
}

function appendContentParts(
  parts: Exclude<ChatMessage["content"], string>,
  content: Content,
  prompt: string,
  options?: BuildMessagesOptions,
): void {
  const imagePart = content.image
    ? {
        type: "image_url" as const,
        image_url: {
          url: normalizeImageUrl(content.image),
          ...(options?.imageDetail ? { detail: options.imageDetail } : {}),
        },
      }
    : null;

  if (options?.imageFirst && imagePart) {
    parts.push(imagePart);
  }

  if (prompt) {
    parts.push({ type: "text", text: prompt });
  }

  if (!options?.imageFirst && imagePart) {
    parts.push(imagePart);
  }
}

export function buildMessages(
  contents: Content[],
  styles: ContentStyle[],
  systemPrompt?: string,
  options?: BuildMessagesOptions,
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (let index = 0; index < contents.length; index += 1) {
    const content = contents[index];
    if (!content) {
      continue;
    }

    const style = styles[index] ?? styles[0];
    const prompt = buildPrompt(content, style);
    const parts: Exclude<ChatMessage["content"], string> = [];

    appendContentParts(parts, content, prompt, options);

    if (parts.length === 0) {
      throw new Error(`Content at index ${index} has no text or image`);
    }

    messages.push({
      role: "user",
      content: parts.length === 1 && parts[0]?.type === "text" ? prompt : parts,
    });
  }

  return messages;
}
