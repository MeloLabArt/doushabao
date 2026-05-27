type OpenRouterErrorBody = {
  message?: string;
  code?: number;
  metadata?: {
    raw?: string;
    provider_name?: string;
  };
};

function parseUpstreamMessage(raw?: string): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string };
      message?: string;
    };

    return parsed.error?.message ?? parsed.message ?? raw;
  } catch {
    return raw;
  }
}

function mapUpstreamToHint(upstream: string): string | undefined {
  const lower = upstream.toLowerCase();

  if (lower.includes("invalid image") || lower.includes("image url")) {
    return "图片格式无效，请重新上传 JPG/PNG 图片后重试。";
  }

  if (lower.includes("resource exhausted") || lower.includes("rate limit") || lower.includes("quota")) {
    return "模型配额或速率已用尽，请稍后重试或更换付费模型。";
  }

  if (lower.includes("context") && lower.includes("length")) {
    return "请求内容过长，请换用更小的图片或减少修图需求文字后重试。";
  }

  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("policy")) {
    return "内容被模型安全策略拦截，请更换图片或调整修图需求后重试。";
  }

  if (lower.includes("does not support") || lower.includes("not support")) {
    return "当前修图模型不支持该请求，请在设置中更换支持图像输出的模型（如 google/gemini-2.5-flash-image）。";
  }

  return undefined;
}

export function formatOpenRouterError(error: OpenRouterErrorBody, stepLabel?: string): string {
  const upstream = parseUpstreamMessage(error.metadata?.raw);
  const hint = upstream ? mapUpstreamToHint(upstream) : undefined;
  const provider = error.metadata?.provider_name?.trim();
  const prefix = stepLabel ? `${stepLabel}：` : "";

  if (hint) {
    return `${prefix}${hint}`;
  }

  const base = error.message?.trim() || "OpenRouter 请求失败";

  if (base === "Provider returned error") {
    const parts = [`${prefix}上游模型返回错误`];
    if (provider) {
      parts.push(`（${provider}）`);
    }
    if (upstream) {
      parts.push(`：${upstream}`);
    } else {
      parts.push("。常见原因：图片过大、模型配额用尽、模型暂不可用或修图模型未选对。请稍后重试，或在设置中确认修图模型支持 image 输出。");
    }
    return parts.join("");
  }

  if (upstream && !base.includes(upstream)) {
    return `${prefix}${base}：${upstream}`;
  }

  return `${prefix}${base}`;
}
