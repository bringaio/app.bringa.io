# Contributing

Thanks for helping improve bringa. Keep contributions small, explicit, and easy for forks to reuse.

## Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` and use **Open local demo** on the login page. First-run development does not need Supabase, OAuth, a `.env.local`, or an invite code.

Read:

- `AGENTS.md` for agent workflow entry points.
- `docs/conventions.md` for Git, CI/CD, naming, docs, and source-of-truth rules.
- `docs/definition-of-done.md` for verification expectations.
- `docs/forking.md` before changing deployment-specific config, legal text, or branding.

## Pull Requests

- Use Conventional Commits.
- Prefer one coherent change per pull request.
- Use short-lived branches. Agents use `codex/<type>-<topic>`; human contributors use `<type>/<topic>` such as `feat/item-images`, `fix/auth-redirect`, or `docs/fork-setup`.
- Keep `deploy/<deployment-slug>` branches for fork-owned publication work, not upstream pull requests.
- Keep generic upstream code changes separate from fork-specific deployment profiles, legal text, and brand assets.
- Do not commit secrets, service credentials, real user data, private exports, or production logs.
- Update docs when behavior, setup, config, CI/CD, operations, security, or fork workflows change.
- Run focused tests for the touched area and report any checks you could not run.

## Fork Deployment Profiles

Forks should customize public app identity through deployment profiles:

```bash
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork
BRINGA_DEPLOYMENT=share.example.org pnpm generate:config
```

Set public Supabase browser values in `config/deployments/<slug>.jsonc`. Keep private values in ignored env files, GitHub secrets, provider dashboards, or Supabase function secrets.

## Verification

For most code changes, run at least:

```bash
pnpm check:config
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Use the manual GitHub Actions CI workflow when remote verification is useful. Workflows are intentionally not run on every push.
