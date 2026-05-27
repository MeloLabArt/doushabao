import { readImageDimensions, resizeImageToDimensions } from "./image-dimensions";

const MAX_API_IMAGE_EDGE = 2048;
const MAX_API_BASE64_LENGTH = 3_500_000;
const MIN_JPEG_QUALITY = 0.55;

function compressImageAsJpeg(imageUrl: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("无法创建画布"));
        return;
      }

      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => {
      reject(new Error("无法压缩图片"));
    };

    image.src = imageUrl;
  });
}

async function compressUntilWithinLimit(imageUrl: string): Promise<string> {
  let quality = 0.88;
  let compressed = imageUrl;

  while (quality >= MIN_JPEG_QUALITY) {
    compressed = await compressImageAsJpeg(compressed, quality);

    if (compressed.length <= MAX_API_BASE64_LENGTH) {
      return compressed;
    }

    quality -= 0.1;
  }

  return compressed;
}

/** 缩小过大图片，避免上游 Provider returned error（常见为体积/分辨率超限）。 */
export async function prepareImageForApi(imageUrl: string): Promise<string> {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return trimmed;
  }

  const dimensions = await readImageDimensions(trimmed);
  const maxEdge = Math.max(dimensions.width, dimensions.height);
  let prepared = trimmed;

  if (maxEdge > MAX_API_IMAGE_EDGE) {
    const scale = MAX_API_IMAGE_EDGE / maxEdge;
    prepared = await resizeImageToDimensions(trimmed, {
      width: Math.max(1, Math.round(dimensions.width * scale)),
      height: Math.max(1, Math.round(dimensions.height * scale)),
    });
  }

  if (prepared.length > MAX_API_BASE64_LENGTH) {
    prepared = await compressUntilWithinLimit(prepared);
  }

  return prepared;
}
