import generatedConfig from "@/config/bringa.config.generated.json";
import { buildPageTitle } from "./app-config-format";

export type AppConfig = typeof generatedConfig;

export const appConfig: AppConfig = generatedConfig;
export { buildPageTitle };

export function formatPageTitle(pageTitle?: string) {
  return buildPageTitle(appConfig, pageTitle);
}
