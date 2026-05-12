# Public Launch Runbook

This runbook is the operator sequence for publishing the upstream `app.bringa.io` application from the public mother repository on GitHub Pages with Supabase Auth and the hosted `app.bringa.io` Supabase project.

Use `main` for the upstream `app.bringa.io` deployment. Reserve `deploy/<slug>` branches for forks or long-lived operator-specific deployment branches.

## Verified State

As of 2026-05-12:

- GitHub repository: `bringaio/app.bringa.io`
- Repository visibility: public
- Forking: enabled
- Repository homepage: `https://app.bringa.io`
- GitHub security switches: secret scanning, secret scanning push protection, vulnerability alerts, and Dependabot security updates enabled
- GitHub Pages source: GitHub Actions
- GitHub Pages custom domain: `app.bringa.io`
- Manual Pages workflow evidence: initial public deploy `25755567245`, docs redeploy `25756046085`, and Node 24 actions opt-in verification `25756158964`, all successful on `main`
- Supabase project: `app.bringa.io`, ref `bqotcfejqljfcfjhavwh`, region `eu-central-1`, status `ACTIVE_HEALTHY`
- Supabase CLI: available through `pnpm exec supabase`, verified with CLI `2.98.2`
- Supabase MCP: not available in this Codex session; use the CLI and dashboard until MCP tools are installed
- Edge Functions: `notifiy-telegram` and `notifiy-telegram-user`, both active with `verify_jwt=true`

GitHub now redirects the default Pages URL to `http://app.bringa.io/` because the custom domain is configured. Public DNS for `app.bringa.io` was not resolving during the 2026-05-12 verification, so Cloudflare DNS is the next required step before GitHub can issue a certificate and HTTPS can be enforced. The Pages workflow opts JavaScript actions into Node 24 with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`; GitHub may still annotate upstream actions that target Node 20 until those actions retarget Node 24, but the launch workflow has been verified under the forced Node 24 runtime.

## Cloudflare DNS

In Cloudflare for `bringa.io`, add this DNS record:

| Type | Name | Target | Proxy status |
| --- | --- | --- | --- |
| `CNAME` | `app` | `bringaio.github.io` | DNS only |

Keep the record DNS-only until GitHub Pages reports the custom domain as verified and its certificate exists. After that, leave it DNS-only unless a Cloudflare proxy, Worker, or custom header layer is deliberately introduced and tested.

Verify from a terminal:

```bash
dig +short app.bringa.io CNAME
curl -I https://app.bringa.io/
```

The CNAME should resolve to `bringaio.github.io.`. HTTPS may fail until GitHub finishes certificate provisioning.

## GitHub Pages Finalization

After the Cloudflare record resolves, check Pages state:

```bash
gh api repos/bringaio/app.bringa.io/pages \
  --jq '{html_url,cname,https_enforced,protected_domain_state,https_certificate}'
```

When `https_certificate` exists and is approved, enforce HTTPS:

```bash
gh api --method PUT repos/bringaio/app.bringa.io/pages \
  -f cname=app.bringa.io \
  -F https_enforced=true \
  -f build_type=workflow
```

Then run the manual Pages workflow when the deployed app needs to be refreshed:

```bash
gh workflow run Pages \
  --repo bringaio/app.bringa.io \
  --ref main \
  -f deployment=app.bringa.io
```

Verify:

```bash
gh run list --repo bringaio/app.bringa.io --workflow Pages --limit 1
curl -I https://app.bringa.io/
```

## Supabase Auth URLs

In Supabase Dashboard for project `bqotcfejqljfcfjhavwh`, open Authentication, then URL Configuration.

Set:

- Site URL: `https://app.bringa.io`
- Additional redirect URL: `https://app.bringa.io/dashboard`
- Local development redirect URL: `http://localhost:3000/dashboard`

Use exact production redirect URLs. Keep wildcard redirects only for local development or explicitly reviewed preview environments.

The app currently calls Supabase OAuth with `redirectTo` set to the browser origin plus the configured `supabase.authRedirectPath`, which is `/dashboard` for `app.bringa.io`.

## Google OAuth

Create or open the Google OAuth web client for `app.bringa.io`.

Configure:

- Authorized JavaScript origin: `https://app.bringa.io`
- Authorized redirect URI: `https://bqotcfejqljfcfjhavwh.supabase.co/auth/v1/callback`

Then in Supabase Dashboard, open Authentication, Providers, Google:

- Enable Google
- Paste the Google Client ID
- Paste the Google Client Secret
- Save

Never store the Google Client Secret in Git, docs, chat, issues, pull requests, screenshots, or generated public content.

## GitHub OAuth

Create or open the GitHub OAuth app for `app.bringa.io`.

Configure:

- Homepage URL: `https://app.bringa.io`
- Authorization callback URL: `https://bqotcfejqljfcfjhavwh.supabase.co/auth/v1/callback`

Then in Supabase Dashboard, open Authentication, Providers, GitHub:

- Enable GitHub
- Paste the GitHub Client ID
- Paste the GitHub Client Secret
- Save

Never store the GitHub Client Secret in Git, docs, chat, issues, pull requests, screenshots, or generated public content.

## Invite Gate Verification

OAuth may be public while app access remains invite-gated. The database creates new profiles with `profile_valid=false`, and protected routes send unvalidated users to `/invite`.

After enabling providers:

1. Sign in with a Google account that has no invite.
2. Confirm the app redirects to `/invite`.
3. Sign out.
4. Sign in with a GitHub account that has no invite.
5. Confirm the app redirects to `/invite`.
6. Apply a valid invite code.
7. Confirm the app reaches `/dashboard`.
8. Confirm the Supabase Auth user exists and the public profile stays non-admin unless an operator explicitly validates or promotes it.

Do not inspect real user row contents unless the operator explicitly approves that for a support task. Prefer route behavior, counts, and metadata.

## Supabase CLI Notes

Useful read-only checks:

```bash
pnpm exec supabase projects list --output json
pnpm exec supabase functions list --project-ref bqotcfejqljfcfjhavwh --output json
pnpm exec supabase secrets list --project-ref bqotcfejqljfcfjhavwh --output json
```

The CLI can list secret names and hashes, but it must not print secret values. Keep the project unlinked unless a migration, type generation, or remote database operation is intentionally being prepared. If linking is needed, confirm the target project first:

```bash
pnpm exec supabase link --project-ref bqotcfejqljfcfjhavwh
```

Do not run `supabase config push` until `supabase/config.toml` contains the intended Auth configuration and the diff has been reviewed. The current file is scoped to Edge Function configuration.

The Supabase custom domain add-on is not required for `app.bringa.io`, because the app domain points to GitHub Pages and the browser talks to `https://bqotcfejqljfcfjhavwh.supabase.co`.

## Source References

- [GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages custom domains](https://docs.github.com/github/working-with-github-pages/managing-a-custom-domain-for-your-github-pages-site)
- [Cloudflare subdomain DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-subdomain/)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase GitHub login](https://supabase.com/docs/guides/auth/social-login/auth-github)
