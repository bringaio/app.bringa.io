export type PageTitleConfig = {
  app: {
    name: string;
    titleTemplate: string;
  };
};

export function buildPageTitle(config: PageTitleConfig, pageTitle?: string) {
  if (!pageTitle) {
    return config.app.name;
  }

  return config.app.titleTemplate.replace("%s", pageTitle);
}
