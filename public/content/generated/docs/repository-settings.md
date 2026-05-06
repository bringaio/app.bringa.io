# Repository Settings

Some GitHub settings are repository state, not code. Keep this checklist aligned with `docs/conventions.md` and review it after major workflow changes.

## Current Repository State

As of 2026-05-05, GitHub API checks confirmed that rebase merging is enabled, merge commits and squash merges are disabled, pull request branch updates are allowed, and merged head branches are deleted automatically. The repository description and topics are configured for open-source discovery. Private forking is currently blocked by organization policy: attempting to set `allow_forking=true` returned `422 This organization does not allow private repository forking`. Branch protection still needs repository UI or plan access while the repository is private. Creating the GitHub Pages site with `build_type=workflow` currently returns `422 Your current plan does not support GitHub Pages for this repository`; enable Pages after the repository visibility or plan decision, then run the first manual Pages workflow from `main` or an intentional `deploy/<slug>` branch.

## Pull Requests

- Enable rebase merging.
- Disable merge commits.
- Keep squash merging disabled unless maintainers explicitly want one-commit PR history.
- Enable automatic deletion of head branches after pull requests merge.
- Require PR review before merging once the maintainer team grows beyond one trusted operator.

## Branch Protection

Protect `main` after the manual CI process is stable.

Manual checks to run before important merges or releases:

- `Secret-free quality checks`
- `Deploy GitHub Pages app`

Recommended rules:

- Require linear history.
- Block force pushes.
- Block branch deletion for `main`.
- Allow administrators to bypass only when an outage or security incident requires it.
- Do not require automatic status checks while workflows are manual-only unless maintainers explicitly commit to running them before merge.

## GitHub Pages

- Set GitHub Pages source to GitHub Actions.
- Use the `github-pages` environment.
- Protect the `github-pages` environment if deployments should require approval.
- Keep app deployment secret-free and run it manually from `main` or an intentional `deploy/<slug>` branch when deployment is needed.
- Use `.github/workflows/pages.yml` to build `out/` and deploy the artifact with GitHub Pages Actions from `main` or `deploy/*`.
- Do not rely on GitHub Pages for repository-managed CSP, Referrer-Policy, Permissions-Policy, or Cache-Control headers. Use [Security](security.md) when deciding whether a fork needs Cloudflare Pages, Netlify, or a reverse proxy/Worker for custom HTTP security headers.

## Custom App Domain

For `app.bringa.io` or a fork-owned subdomain:

1. Add or update a deployment profile with `pnpm create:deployment -- <slug>` or by editing `config/deployments/<slug>.jsonc`.
2. Set `app.canonicalUrl` to the final HTTPS app URL.
3. Set `supabase.url` and `supabase.publishableKey` to that deployment's public Supabase API values.
4. Run `BRINGA_DEPLOYMENT=<slug> pnpm generate:config` and commit the generated app config/content in the deployment branch.
5. In GitHub repository settings, set Pages source to GitHub Actions and set the custom domain.
6. In DNS, create a `CNAME` record from the subdomain to `<github-owner>.github.io`. For subdomains, do not include the repository name in the CNAME target.
7. After DNS verifies, enable HTTPS in GitHub Pages.
8. Run the manual **Pages** workflow from `main` or `deploy/<slug>`.

## Supabase Auth URLs

In Supabase Auth URL Configuration:

- Set Site URL to the production app URL, for example `https://app.bringa.io`.
- Add the exact production redirect path used by `supabase.authRedirectPath`, for example `https://app.bringa.io/dashboard`.
- Add local development redirects such as `http://localhost:3000/dashboard` or `http://localhost:3000/**`.
- Use exact production redirect URLs instead of broad wildcards for released deployments.

OAuth providers still need their provider-side callback URL configured to the Supabase Auth callback for the selected Supabase project. Keep provider secrets in Supabase or the provider dashboard, never in this repository.

## Forks

Fork operators can keep these workflows without upstream secrets. Deployment-specific app hosting, Supabase secrets, custom domains, and legal text belong in fork-owned repository settings, environment variables, and config files. Use a long-lived `deploy/<slug>` branch when a fork wants generated deployment artifacts and local operator changes to stay separate from clean upstream pull request branches.

Before the public release, confirm that the repository is public or that the organization allows private forks. Forkability is a release requirement; it cannot be proven while `allow_forking` stays blocked by private-repository organization policy.
