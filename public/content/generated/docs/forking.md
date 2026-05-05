# Forking

Forks should be able to customize identity, legal text, deployment settings, and operations without making upstream pull requests painful.

For the content layering model, see [Fork Content Strategy](fork-content-strategy.md).

## Recommended Model

Use deployment profiles instead of editing the same root files in every fork.

Current structure:

```text
config/base.config.jsonc
config/deployments/app.bringa.io.jsonc
config/local.config.jsonc
content/default/legal/en.md
content/deployments/<fork-slug>/
public/content/generated/
public/icon.svg
```

`config/local.config.jsonc` is ignored and only loaded when `BRINGA_CONFIG_INCLUDE_LOCAL=true`.

Deployment-specific content lives in `content/deployments/<fork-slug>/` and is generated into `public/content/generated/` with `pnpm generate:config`. The current app references generated public files through config paths.

To create a fork profile, use the generator first:

```bash
pnpm setup:operator --dry-run
pnpm setup:operator
```

For non-interactive use:

```bash
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork --dry-run
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork
```

Use `--dry-run` to preview the public profile and next steps before writing files.

Then:

1. Edit `config/deployments/<fork-slug>.jsonc`.
2. Add matching longer text overrides under `content/deployments/<fork-slug>/` when local legal, onboarding, help, or issue copy differs.
3. Override only the values that differ from `config/base.config.jsonc`.
4. Run `BRINGA_DEPLOYMENT=<fork-slug> pnpm generate:config`.
5. Commit the profile, content overrides, and generated outputs in the fork.

To publish a fork on GitHub Pages:

1. Choose a deployment slug, usually the app domain such as `share.example.org`.
2. Scaffold the profile with `pnpm setup:operator`, or use `pnpm create:deployment -- <slug>` for non-interactive setup.
3. Review `app.canonicalUrl`, repository links, public Supabase values, legal content, and brand assets in that deployment profile.
4. Decide where the fork deploys from:
   - use the fork's `main` when local deployment config is meant to live there;
   - use `deploy/<slug>` when the fork wants a long-lived operator branch and cleaner upstream-sync branches.
5. Configure the repository's Pages source as GitHub Actions.
6. Point a subdomain CNAME to `<github-owner>.github.io`.
7. Add the matching Site URL and redirect URLs in Supabase Auth settings.
8. Run the manual **Pages** workflow from `main` or `deploy/<slug>`.

## What Forks Commonly Customize

- App name and short name
- Logo and icons
- Terms, privacy notes, and legal contact
- Languages
- Supabase project and Auth providers
- Public Supabase API URL and publishable key in deployment config
- Local demo mode policy for development profiles
- Repository, issue, and support links
- Operator default owner label
- Theme and brand assets

## Legal Text

Legal text is expected to diverge. Upstream should provide starter text only, with clear disclaimers that it is not legal advice and must be reviewed by each operator.

Forks should keep their own legal documents in deployment-specific content paths. CI should validate that required files exist, not that every fork uses upstream wording.

## Updating From Upstream

1. Fetch upstream changes.
2. Review config schema, base config, docs, migrations, and breaking changes.
3. Rebase or merge upstream into the fork branch according to the fork's policy.
4. Preserve fork-specific deployment config, legal text, and brand assets.
5. Regenerate config with the fork's `BRINGA_DEPLOYMENT` and run the manual CI workflow when remote verification is needed.
6. Resolve conflicts explicitly; do not hide legal/config conflicts with custom merge drivers.

For upstream pull requests from a fork, start a short-lived branch from upstream `main` and leave fork deployment branches out of the PR. Use `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`, `refactor/<topic>`, `test/<topic>`, or `ci/<topic>` for human branches. Agents should use `codex/<type>-<topic>`.

## CI/CD For Forks

Fork CI should not require upstream secrets. The upstream workflows are manual-only by default so fork operators can choose when remote checks run.

Recommended split:

- Secret-free: install, config generation, config validation, typecheck, static build, Pages artifact build.
- Secret-required: deployment, Supabase backup, remote migrations, Edge Function deploy.

Fork operators can keep upstream workflows if they configure their own repository variables and secrets.

## Local Development

`pnpm dev` starts with local demo mode enabled by default, so contributors can inspect the app without OAuth or a live Supabase project.

When a fork needs the local Supabase CLI stack:

```bash
supabase start
supabase status -o env
BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
```

Use `config/local.config.jsonc` for ignored local overrides, including `"development": { "localDemoMode": false }` and local public Supabase values.
