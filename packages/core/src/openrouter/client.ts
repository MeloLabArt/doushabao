import { Config } from "../types/config";
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  GenerateOptions,
  GenerateResult,
} from "../types/openrouter";
import { buildMessages } from "./build-messages";

const DEFAULT_HOST = "https://openrouter.ai/api/v1";
const DEFAULT_MODALITIES: ("image" | "text")[] = ["image", "text"];

export type OpenRouterCredentials = Pick<Config, "host" | "key">;

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
      throw new Error(payload.error?.message ?? `OpenRouter request failed with status ${response.status}`);
    }

    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }

    return payload;
  }

  async generate(
    model: string,
    messages: ChatCompletionRequest["messages"],
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    const response = await this.chatCompletion({
      model,
      messages,
      modalities: options.modalities ?? DEFAULT_MODALITIES,
      image_config: options.imageConfig,
    });

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
}

export function createOpenRouterClient(config: OpenRouterCredentials): OpenRouterClient {
  return new OpenRouterClient(config);
}

export { buildMessages };
