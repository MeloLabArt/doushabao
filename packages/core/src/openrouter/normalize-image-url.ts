const BASE64_IMAGE_PREFIX = /^data:image\/[\w+.-]+;base64,/;

export function normalizeImageUrl(image: string): string {
  const trimmed = image.trim();
  if (!trimmed) {
    throw new Error("Image is empty");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || BASE64_IMAGE_PREFIX.test(trimmed)) {
    return trimmed;
  }

  return `data:image/png;base64,${trimmed}`;
}
