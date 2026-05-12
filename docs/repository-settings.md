---
title: Repository Settings
---

# Repository Settings

Some GitHub settings are repository state, not code. Keep this checklist aligned with `docs/conventions.md` and review it after major workflow changes.

## Current Repository State

As of 2026-05-12, GitHub API checks confirmed that the repository is public, forking is enabled, rebase merging is enabled, merge commits and squash merges are disabled, pull request branch updates are allowed, and merged head branches are deleted automatically. The repository description, topics, and homepage are configured for open-source discovery. Secret scanning, secret scanning push protection, vulnerability alerts, and Dependabot security updates are enabled. GitHub Pages is enabled with GitHub Actions as the source, `app.bringa.io` is set as the custom domain, and manual Pages runs `25755567245`, `25756046085`, and `25756158964` deployed successfully from `main`. The Pages workflow opts JavaScript actions into Node 24 with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`. Cloudflare DNS still needs the `app` CNAME before GitHub can issue the custom-domain certificate and HTTPS can be enforced. Use [Public Launch Runbook](public-launch-runbook.md) for the current operator sequence.

## Pull Requests

- Enable rebase merging.
- Disable merge commits.
- Keep squash merging disabled unless maintainers explicitly want one-commit PR history.
- Enable automatic deletion of head branches after pull requests merge.
- Require PR review before merging once the maintainer team grows beyond one trusted operator.

## Branch Protection

Protect `main`. At minimum, block force pushes and branch deletion. This preserves the integration branch without blocking the maintainer from doing explicit release or merge work.

Manual checks to run before important merges or releases:

- `Secret-free quality checks`
- `Deploy GitHub Pages app`

Recommended rules:

- Require linear history.
- Block force pushes.
- Block branch deletion for `main`.
- Keep **Require a pull request before merging** off while one trusted maintainer still needs direct emergency or release pushes.
- Turn **Require a pull request before merging** on when the project is ready to require every change to land through review.
- Allow administrators to bypass only when an outage or security incident requires it.
- Do not require automatic status checks while workflows are manual-only unless maintainers explicitly commit to running them before merge.

With only force-push and deletion protection, normal direct pushes by users with write access can still work. Direct pushes stop once rules such as required pull requests, push restrictions, or required checks are enabled in a way that applies to the pusher.

## GitHub Pages

- Keep GitHub Pages source set to GitHub Actions.
- Use the `github-pages` environment.
- Protect the `github-pages` environment if deployments should require approval.
- Keep app deployment secret-free and run it manually from `main` or an intentional `deploy/<slug>` branch when deployment is needed.
- Use `.github/workflows/pages.yml` to build `out/` and deploy the artifact with GitHub Pages Actions from `main` or `deploy/*`.
- For the upstream `app.bringa.io` deployment, run the manual **Pages** workflow from `main` with deployment slug `app.bringa.io`.
- Do not rely on GitHub Pages for repository-managed CSP, Referrer-Policy, Permissions-Policy, or Cache-Control headers. Use [Security](security.md) when deciding whether a fork needs Cloudflare Pages, Netlify, or a reverse proxy/Worker for custom HTTP security headers.

## Custom App Domain

For `app.bringa.io` or a fork-owned subdomain:

1. Add or update a deployment profile with `pnpm create:deployment -- <slug>` or by editing `config/deployments/<slug>.jsonc`.
2. Set `app.canonicalUrl` to the final HTTPS app URL.
3. Set `supabase.url` and `supabase.publishableKey` to that deployment's public Supabase API values.
4. Run `BRINGA_DEPLOYMENT=<slug> pnpm generate:config` and commit the generated app config/content in the deployment branch.
5. In GitHub repository settings, set Pages source to GitHub Actions and set the custom domain.
6. In DNS, create a `CNAME` record from the subdomain to `<github-owner>.github.io`. For subdomains, do not include the repository name in the CNAME target. For `app.bringa.io`, create `app CNAME bringaio.github.io` in Cloudflare and keep it DNS-only until GitHub issues the Pages certificate.
7. After DNS verifies, wait for GitHub Pages to issue the certificate, then enable **Enforce HTTPS**. This often takes a few minutes; GitHub documents that the option can take up to 24 hours to become available, so a pending certificate is normal.
8. Run the manual **Pages** workflow from `main` or `deploy/<slug>`.

For a complete fork setup sequence, use [Fork Launch Runbook](fork-launch-runbook.md).

## Supabase Auth URLs

In Supabase Auth URL Configuration:

- Set Site URL to the production app URL, for example `https://app.bringa.io`.
- Add the exact production redirect path used by `supabase.authRedirectPath`, for example `https://app.bringa.io/dashboard`.
- Add local development redirects such as `http://localhost:3000/dashboard` or `http://localhost:3000/**`.
- Use exact production redirect URLs instead of broad wildcards for released deployments.

OAuth providers still need their provider-side callback URL configured to the Supabase Auth callback for the selected Supabase project. Keep provider secrets in Supabase or the provider dashboard, never in this repository.

## Forks

Fork operators can keep these workflows without upstream secrets. Deployment-specific app hosting, Supabase secrets, custom domains, and legal text belong in fork-owned repository settings, environment variables, and config files. Use a long-lived `deploy/<slug>` branch when a fork wants generated deployment artifacts and local operator changes to stay separate from clean upstream pull request branches.

Before a public announcement, confirm the custom domain, HTTPS enforcement, OAuth provider setup, and invite-gate behavior from a browser. Forkability is now proven for the public upstream repository.
