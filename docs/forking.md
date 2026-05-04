# Forking

Forks should be able to customize identity, legal text, deployment settings, and operations without making upstream pull requests painful.

## Recommended Model

Use deployment profiles instead of editing the same root files in every fork.

Target direction:

```text
config/base.config.jsonc
config/deployments/app.bringa.io.jsonc
config/deployments/example-community.jsonc
config/local.config.jsonc
content/legal/starter/en.md
content/legal/starter/de.md
content/deployments/<fork-slug>/legal/*.md
public/brand/<fork-slug>/...
```

The current repository still uses `config/bringa.config.jsonc`; migration to deployment profiles should be done as a focused change.

## What Forks Commonly Customize

- App name and short name
- Logo and icons
- Terms, privacy notes, and legal contact
- Languages
- Supabase project and Auth providers
- Repository, issue, and support links
- Operator default owner label
- Theme and brand assets

## Legal Text

Legal text is expected to diverge. Upstream should provide starter text only, with clear disclaimers that it is not legal advice and must be reviewed by each operator.

Forks should keep their own legal documents in deployment-specific content paths once deployment profiles exist. CI should validate that required files exist, not that every fork uses upstream wording.

## Updating From Upstream

1. Fetch upstream changes.
2. Review config schema, docs, migrations, and breaking changes.
3. Rebase or merge upstream into the fork branch according to the fork's policy.
4. Preserve fork-specific deployment config, legal text, and brand assets.
5. Regenerate config and run CI.
6. Resolve conflicts explicitly; do not hide legal/config conflicts with custom merge drivers.

## CI/CD For Forks

Fork CI should not require upstream secrets.

Recommended split:

- Secret-free: install, config generation, config validation, typecheck, static build, docs build.
- Secret-required: deployment, Supabase backup, remote migrations, Edge Function deploy.

Fork operators can keep upstream workflows if they configure their own repository variables and secrets.
