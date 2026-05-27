import { Content, ContentStyle } from "../types/content";
import { ChatMessage } from "../types/openrouter";
import { normalizeImageUrl } from "./normalize-image-url";

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

export function buildMessages(
  contents: Content[],
  styles: ContentStyle[],
  systemPrompt?: string,
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
    const parts: ChatMessage["content"] = [];

    if (prompt) {
      parts.push({ type: "text", text: prompt });
    }

    if (content.image) {
      parts.push({
        type: "image_url",
        image_url: { url: normalizeImageUrl(content.image) },
      });
    }

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
