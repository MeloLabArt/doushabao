export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string | ChatContentPart[];
};

export type ImageConfig = {
  aspect_ratio?: string;
  image_size?: "0.5K" | "1K" | "2K" | "4K";
  strength?: number;
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  modalities?: ("image" | "text")[];
  image_config?: ImageConfig;
  stream?: boolean;
};

export type GeneratedImage = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

export type ChatCompletionMessage = {
  role: string;
  content?: string | null;
  images?: GeneratedImage[];
};

export type ChatCompletionChoice = {
  index: number;
  message: ChatCompletionMessage;
  finish_reason?: string | null;
};

export type ChatCompletionResponse = {
  id: string;
  choices: ChatCompletionChoice[];
  error?: {
    message: string;
    code?: number;
    metadata?: Record<string, unknown>;
  };
};

export type GenerateOptions = {
  modalities?: ("image" | "text")[];
  imageConfig?: ImageConfig;
  systemPrompt?: string;
};

export type GenerateResult = {
  text?: string;
  images: string[];
};
