import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImageCompressionOptions,
  buildImageUploadAccept,
  formatBytes,
  validateImageFileAgainstConfig,
} from "../src/lib/media-policy.ts";

const mediaConfig = {
  acceptedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxUploadBytes: 10_485_760,
  compressionMaxSizeMb: 1,
  compressionMaxWidthOrHeight: 1920,
};

test("formats image upload accept values from media config", () => {
  assert.equal(buildImageUploadAccept(mediaConfig), "image/jpeg,image/png,image/webp");
});

test("validates allowed image MIME types and max upload bytes", () => {
  assert.equal(validateImageFileAgainstConfig({ type: "image/jpeg", size: 10_485_760 }, mediaConfig), null);

  assert.equal(
    validateImageFileAgainstConfig({ type: "image/gif", size: 100 }, mediaConfig),
    "Please upload one of these image types: image/jpeg, image/png, image/webp",
  );

  assert.equal(
    validateImageFileAgainstConfig({ type: "image/png", size: 10_485_761 }, mediaConfig),
    "Image is too large. Maximum size is 10.0 MB.",
  );
});

test("builds browser image compression options from media config", () => {
  assert.deepEqual(buildImageCompressionOptions(mediaConfig), {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.85,
  });
});

test("formats bytes for upload copy", () => {
  assert.equal(formatBytes(12), "12 B");
  assert.equal(formatBytes(2_048), "2 KB");
  assert.equal(formatBytes(1_572_864), "1.5 MB");
});
