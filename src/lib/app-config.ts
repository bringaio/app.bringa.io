import generatedConfig from "@/config/bringa.config.generated.json";

export type AppConfig = typeof generatedConfig;

export const appConfig: AppConfig = generatedConfig;

export function formatPageTitle(pageTitle?: string) {
  if (!pageTitle) {
    return appConfig.app.name;
  }

  return appConfig.app.titleTemplate.replace("%s", pageTitle);
}
