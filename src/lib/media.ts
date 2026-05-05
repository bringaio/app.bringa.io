import { appConfig } from "@/lib/app-config"
import {
  buildImageCompressionOptions,
  buildImageUploadAccept,
  formatBytes,
  validateImageFileAgainstConfig,
} from "@/lib/media-policy"

export const imageUploadAccept = buildImageUploadAccept(appConfig.media)

export function validateImageFile(file: File) {
  return validateImageFileAgainstConfig(file, appConfig.media)
}

export function getImageCompressionOptions() {
  return buildImageCompressionOptions(appConfig.media)
}

export { formatBytes }
