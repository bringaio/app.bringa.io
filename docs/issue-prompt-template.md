---
title: Issue Prompt Template
---

# Issue Prompt Template

Use this with an AI assistant before opening a bug report, feature request, or feedback issue.

The deployment-editable source is `content/default/issues/en.md`, optionally overridden by `content/deployments/<slug>/issues/en.md`.

`pnpm generate:config` writes the public app copy to `public/content/generated/issues/en.md`, and Settings renders the configured `content.issuePromptPath` with `<repo-url>` replaced by the deployment repository URL.
