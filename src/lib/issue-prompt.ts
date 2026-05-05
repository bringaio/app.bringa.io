export function renderIssuePrompt(template: string, repositoryUrl: string): string {
  const repoLabel = repositoryUrl.trim() || "this repository";
  return template.replaceAll("<repo-url>", repoLabel).trim();
}
