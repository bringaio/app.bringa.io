import assert from "node:assert/strict";
import test from "node:test";

import { buildPwaManifest } from "../src/lib/pwa-manifest.ts";

test("builds the app manifest from public app and branding config", () => {
  const manifest = buildPwaManifest({
    app: {
      name: "Community Tools",
      shortName: "Tools",
      description: "Shared tools.",
      homeHref: "/dashboard",
    },
    branding: {
      iconPath: "/brand/icon.svg",
      backgroundColor: "#ffffff",
      themeColor: "#111111",
    },
  });

  assert.equal(manifest.name, "Community Tools");
  assert.equal(manifest.short_name, "Tools");
  assert.equal(manifest.description, "Shared tools.");
  assert.equal(manifest.start_url, "/dashboard");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#ffffff");
  assert.equal(manifest.theme_color, "#111111");
  assert.deepEqual(manifest.icons, [
    {
      src: "/brand/icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/brand/icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "maskable",
    },
  ]);
});
