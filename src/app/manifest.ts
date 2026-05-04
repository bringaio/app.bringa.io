import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/app-config";
import { buildPwaManifest } from "@/lib/pwa-manifest";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return buildPwaManifest(appConfig);
}
