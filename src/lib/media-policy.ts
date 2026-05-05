export type MediaPolicyConfig = {
  acceptedImageMimeTypes: string[];
  maxUploadBytes: number;
  compressionMaxSizeMb: number;
  compressionMaxWidthOrHeight: number;
};

export type ImageFileLike = {
  type: string;
  size: number;
};

export function buildImageUploadAccept(config: MediaPolicyConfig) {
  return config.acceptedImageMimeTypes.join(",");
}

export function validateImageFileAgainstConfig(file: ImageFileLike, config: MediaPolicyConfig) {
  if (!config.acceptedImageMimeTypes.includes(file.type)) {
    return `Please upload one of these image types: ${config.acceptedImageMimeTypes.join(", ")}`;
  }

  if (file.size > config.maxUploadBytes) {
    return `Image is too large. Maximum size is ${formatBytes(config.maxUploadBytes)}.`;
  }

  return null;
}

export function buildImageCompressionOptions(config: MediaPolicyConfig) {
  return {
    maxSizeMB: config.compressionMaxSizeMb,
    maxWidthOrHeight: config.compressionMaxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.85,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
