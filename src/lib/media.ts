import { appConfig } from "@/lib/app-config"

export const imageUploadAccept = appConfig.media.acceptedImageMimeTypes.join(",")

export function validateImageFile(file: File) {
  if (!appConfig.media.acceptedImageMimeTypes.includes(file.type)) {
    return `Please upload one of these image types: ${appConfig.media.acceptedImageMimeTypes.join(", ")}`
  }

  if (file.size > appConfig.media.maxUploadBytes) {
    return `Image is too large. Maximum size is ${formatBytes(appConfig.media.maxUploadBytes)}.`
  }

  return null
}

export function getImageCompressionOptions() {
  return {
    maxSizeMB: appConfig.media.compressionMaxSizeMb,
    maxWidthOrHeight: appConfig.media.compressionMaxWidthOrHeight,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.85,
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
