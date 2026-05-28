import { Config } from "../types/config";
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  GenerateOptions,
  GenerateResult,
} from "../types/openrouter";
import { buildMessages } from "./build-messages";
import { formatOpenRouterError } from "./format-openrouter-error";

const DEFAULT_HOST = "https://openrouter.ai/api/v1";
const IMAGE_OUTPUT_MODALITIES: ("image" | "text")[] = ["image"];
const IMAGE_TEXT_OUTPUT_MODALITIES: ("image" | "text")[] = ["image", "text"];

function isModalityError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("output modalities") || lower.includes("requested output modalities");
}

function modalitiesKey(modalities: ("image" | "text")[]): string {
  return modalities.slice().sort().join(",");
}

function buildModalityCandidates(explicit?: ("image" | "text")[]): ("image" | "text")[][] {
  const defaults: ("image" | "text")[][] = [IMAGE_OUTPUT_MODALITIES, IMAGE_TEXT_OUTPUT_MODALITIES];
  const candidates: ("image" | "text")[][] = [];

  if (explicit?.length) {
    candidates.push(explicit);
  }

  for (const fallback of defaults) {
    if (!candidates.some((item) => modalitiesKey(item) === modalitiesKey(fallback))) {
      candidates.push(fallback);
    }
  }

  return candidates;
}

function isRetryableProviderError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("provider returned error") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("overloaded")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type OpenRouterCredentials = {
  host: string;
  key: string;
};

function normalizeHost(host: string): string {
  return host.replace(/\/+$/, "");
}

function extractImages(message: ChatCompletionResponse["choices"][number]["message"]): string[] {
  if (!message.images?.length) {
    return [];
  }

  return message.images
    .map((image) => image.image_url?.url)
    .filter((url): url is string => Boolean(url));
}

function extractText(message: ChatCompletionResponse["choices"][number]["message"]): string | undefined {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }

  return undefined;
}

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenRouterCredentials) {
    this.apiKey = config.key;
    this.baseUrl = normalizeHost(config.host || DEFAULT_HOST);
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stream: false,
        ...request,
      }),
    });

    const payload = (await response.json()) as ChatCompletionResponse;

    if (!response.ok) {
      throw new Error(
        payload.error
          ? formatOpenRouterError(payload.error)
          : `OpenRouter 请求失败（HTTP ${response.status}）`,
      );
    }

    if (payload.error?.message) {
      throw new Error(formatOpenRouterError(payload.error));
    }

    return payload;
  }

  private async generateWithModalities(
    model: string,
    messages: ChatCompletionRequest["messages"],
    options: GenerateOptions,
    modalities?: ("image" | "text")[],
  ): Promise<GenerateResult> {
    const request: ChatCompletionRequest = {
      model,
      messages,
    };

    if (modalities?.length) {
      request.modalities = modalities;
    }

    if (options.imageConfig) {
      request.image_config = options.imageConfig;
    }

    const response = await this.chatCompletion(request);
    const choice = response.choices[0];

    if (!choice) {
      throw new Error("OpenRouter returned no choices");
    }

    const images = extractImages(choice.message);
    const text = extractText(choice.message);

    if (images.length === 0 && !text) {
      throw new Error("OpenRouter returned no text or images");
    }

    return { text, images };
  }

  async generateText(
    model: string,
    messages: ChatCompletionRequest["messages"],
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    return this.generateWithModalities(model, messages, options);
  }

  async generateImage(
    model: string,
    messages: ChatCompletionRequest["messages"],
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    const modalityCandidates = buildModalityCandidates(options.modalities);
    let lastError: Error | null = null;

    for (const modalities of modalityCandidates) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          return await this.generateWithModalities(model, messages, options, modalities);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          if (isModalityError(message)) {
            lastError = error instanceof Error ? error : new Error(message);
            break;
          }

          if (attempt === 0 && isRetryableProviderError(message)) {
            await sleep(1500);
            continue;
          }

          throw error;
        }
      }
    }

    throw lastError ?? new Error("OpenRouter 图片生成失败");
  }

  /** @deprecated Use generateText or generateImage instead. */
  async generate(
    model: string,
    messages: ChatCompletionRequest["messages"],
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    if (options.modalities?.length === 1 && options.modalities[0] === "text") {
      return this.generateText(model, messages, options);
    }

    return this.generateImage(model, messages, options);
  }
}

export function createOpenRouterClient(config: OpenRouterCredentials): OpenRouterClient {
  return new OpenRouterClient(config);
}

export { buildMessages };
