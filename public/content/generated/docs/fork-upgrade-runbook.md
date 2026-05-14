# Fork Upgrade Runbook

Use this runbook when a fork wants to merge a newer upstream version without losing fork-owned deployment config, legal text, brand assets, Supabase policy, or operator history.

## Upgrade In 7 Steps

1. Confirm the fork target: current fork branch, deployment slug, app URL, Supabase project, current `package.json` version, and target upstream version or tag.
2. Create a short-lived upgrade branch from the fork's current integration or deployment branch.
3. Fetch upstream `main` and tags, then review `docs/changelog.md`, `docs/forking.md`, migrations, config schema changes, and breaking notes.
4. Merge or rebase the target upstream commit into the upgrade branch. Resolve conflicts manually in fork-owned config, legal text, branding, generated docs, and Supabase files.
5. Set `package.json.version` to one [Semantic Versioning 2.0.0](https://semver.org/) `MAJOR.MINOR.PATCH` value greater than both the previous fork version and the target upstream version.
6. Regenerate config with `BRINGA_DEPLOYMENT=<slug> pnpm generate:config`, then run the secret-free checks and review any Supabase migrations before applying them to a hosted project.
7. Deploy, verify the setup-required login view is gone, smoke-test auth/admin/item flows, then delete the merged upgrade branch.

## Preserve Fork-Owned State

Keep these fork-owned files and settings intentional during conflict resolution:

- `config/deployments/<slug>.jsonc`;
- `content/deployments/<slug>/`;
- brand assets and app icons;
- GitHub Pages custom domain, DNS, and HTTPS settings;
- Supabase Auth providers, redirect URLs, RLS, Storage policies, Edge Function secrets, backups, and restore policy.

Do not hide conflicts with merge drivers. A visible conflict in legal, deployment, migration, or config files is a useful review point.

## Required Evidence

- `package.json.version` is greater than the old fork version and the merged upstream version.
- The version follows SemVer: patch for compatible fixes, docs, and tooling; minor for compatible feature releases; major for breaking changes.
- `docs/changelog.md` or fork release notes explain the upgrade.
- `BRINGA_DEPLOYMENT=<slug> pnpm check:config`
- `pnpm check:version-bump -- --base <fork-main-or-upstream-ref>`
- `pnpm check:secrets`
- `pnpm check:docs-index`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `pnpm check:static-export`
- `pnpm check:production-bundle`
- Supabase migrations are reviewed before live application.
- Browser smoke test covers login, setup-required guard absence, dashboard, user-menu version display, admin access, and one item flow.

## Agent Prompt

```text
Upgrade this bringa fork from its current version to upstream <version-or-commit>. Preserve deployment config, legal text, brand assets, Supabase project settings, and operator branches. Bump package.json to a Semantic Versioning 2.0.0 MAJOR.MINOR.PATCH version greater than both fork and upstream, regenerate config for <deployment-slug>, list any Supabase migrations or manual dashboard tasks, run secret-free checks, and delete the upgrade branch after merge.
```
