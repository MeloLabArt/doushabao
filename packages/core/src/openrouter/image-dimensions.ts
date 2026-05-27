import type { ImageConfig } from "../types/openrouter";

export type ImageDimensions = {
  width: number;
  height: number;
};

const SUPPORTED_ASPECT_RATIOS: Array<{ label: string; value: number }> = [
  { label: "1:1", value: 1 },
  { label: "2:3", value: 2 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "3:4", value: 3 / 4 },
  { label: "4:3", value: 4 / 3 },
  { label: "4:5", value: 4 / 5 },
  { label: "5:4", value: 5 / 4 },
  { label: "9:16", value: 9 / 16 },
  { label: "16:9", value: 16 / 9 },
  { label: "21:9", value: 21 / 9 },
];

export function resolveAspectRatio(dimensions: ImageDimensions): string {
  const ratio = dimensions.width / dimensions.height;

  let closest = SUPPORTED_ASPECT_RATIOS[0]!;
  let minDiff = Number.POSITIVE_INFINITY;

  for (const candidate of SUPPORTED_ASPECT_RATIOS) {
    const diff = Math.abs(ratio - candidate.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }

  return closest.label;
}

export function buildImageConfigForDimensions(dimensions: ImageDimensions): ImageConfig {
  return {
    aspect_ratio: resolveAspectRatio(dimensions),
  };
}

export function readImageDimensions(imageUrl: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("无法读取图片尺寸"));
        return;
      }

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      reject(new Error("无法读取图片尺寸"));
    };

    image.src = imageUrl;
  });
}

function detectMimeType(imageUrl: string): string {
  const match = imageUrl.match(/^data:(image\/[\w+.-]+);base64,/);
  return match?.[1] ?? "image/png";
}

export function resizeImageToDimensions(
  imageUrl: string,
  dimensions: ImageDimensions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("无法创建画布"));
        return;
      }

      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      resolve(canvas.toDataURL(detectMimeType(imageUrl)));
    };

    image.onerror = () => {
      reject(new Error("无法缩放图片"));
    };

    image.src = imageUrl;
  });
}
