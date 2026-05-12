---
title: Fork Launch Runbook
---

# Fork Launch Runbook

This is the calm path from fork to a usable Bringa app on your own domain. It assumes the default deployment model: GitHub Pages for the static app and hosted Supabase for Auth, database, Storage, and Edge Functions.

Use this page for forks. The upstream `app.bringa.io` launch is recorded separately in [Public Launch Runbook](public-launch-runbook.md).

## Fork In 3 Steps

1. Configure the fork.

   ```bash
   pnpm install
   pnpm setup:operator
   BRINGA_DEPLOYMENT=<your-domain> pnpm generate:config
   BRINGA_DEPLOYMENT=<your-domain> pnpm check:config
   ```

2. Connect Supabase, OAuth, and the first admin.

   Apply the committed Supabase schema or migrations, set Auth URLs, enable Google or GitHub providers, let the intended first admin sign in once, then run:

   ```bash
   pnpm bootstrap:first-admin --confirm-project-ref <project-ref>
   pnpm bootstrap:first-admin --confirm-project-ref <project-ref> --execute
   ```

3. Publish with GitHub Pages.

   Set Pages source to GitHub Actions, add your custom domain, add DNS, run the manual **Pages** workflow, wait for GitHub's certificate, then enable **Enforce HTTPS**.

## 1. Configure The Fork

Choose a deployment slug, usually the app domain such as `share.example.org`.

For interactive setup:

```bash
pnpm setup:operator --dry-run
pnpm setup:operator
```

For non-interactive setup:

```bash
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork --dry-run
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork
```

Review `config/deployments/<slug>.jsonc`:

- `app.canonicalUrl`: final HTTPS app URL, for example `https://share.example.org`
- `repository.owner` and `repository.name`: your fork
- `supabase.url`: public Supabase project URL
- `supabase.publishableKey`: public browser publishable key
- `supabase.authRedirectPath`: normally `/dashboard`

Public Supabase URL and publishable key are expected to ship to the browser. They are safe only when RLS, Storage policies, and RPC boundaries are correct. Supabase secret keys, service-role keys, OAuth secrets, Telegram tokens, and database passwords never belong in Git, docs, issues, screenshots, or chat.

If a production fork is served with scaffold placeholders, a local Supabase URL, or upstream `app.bringa.io` config on a different public domain, the login page shows a setup-required view and links back to this runbook. That view is a guardrail for unfinished public forks; it is not a replacement for `pnpm check:config` or the launch checklist below.

Generate and check:

```bash
BRINGA_DEPLOYMENT=<slug> pnpm generate:config
BRINGA_DEPLOYMENT=<slug> pnpm check:config
```

Use `deploy/<slug>` when the fork wants a long-lived publishing branch that stays separate from clean upstream-sync or pull-request branches. A simple fork can publish from `main`.

## 2. Connect Supabase And OAuth

Create a hosted Supabase project. For a fresh project, apply `supabase/schema.sql` as the baseline. For an existing project, apply reviewed migrations from `supabase/migrations/`.

In Supabase Auth URL Configuration:

- Site URL: `https://<your-domain>`
- Additional redirect URL: `https://<your-domain>/dashboard`
- Local development redirect URL when needed: `http://localhost:3000/dashboard`

In Google or GitHub OAuth provider settings, the provider callback URL is:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

For Google OAuth:

- Authorized JavaScript origin: `https://<your-domain>`
- Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

For GitHub OAuth:

- Homepage URL: `https://<your-domain>`
- Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

Paste provider client IDs and secrets only into the provider dashboard or Supabase dashboard. Do not paste them into Git, generated docs, chat, issues, pull requests, screenshots, or public config.

## 3. Bootstrap The First Admin

After OAuth is enabled, the intended first admin should sign in once. This creates a profile. Fresh projects have no admin row yet, so there is no invite code until the first admin is bootstrapped.

Set local trusted maintenance values in `.env.local`:

```bash
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_SECRET_KEY=<server-only secret key>
```

Then run a dry run:

```bash
pnpm bootstrap:first-admin --confirm-project-ref <project-ref>
```

If the dry run reports one profile and zero admins, execute:

```bash
pnpm bootstrap:first-admin --confirm-project-ref <project-ref> --execute
```

If more than one profile exists, choose the intended first admin explicitly:

```bash
pnpm bootstrap:first-admin --confirm-project-ref <project-ref> --profile-id <uuid> --execute
```

The helper prints the first admin invite code only after execution. Treat that code like an access token for your community: do not commit it, post it publicly, paste it into issues, or include it in screenshots. Admins can rotate their invite code later at `/admin/invite-code`.

Invite codes validate access to the app; they do not make someone an admin. To make another user an admin immediately, ask them to sign in once, validate their profile if needed, then use `/admin/users` to promote that profile. Do not create or share a separate "admin code" for self-promotion.

## 4. Publish With GitHub Pages

In GitHub repository settings:

1. Set Pages source to **GitHub Actions**.
2. Add the custom domain, for example `share.example.org`.
3. Keep the manual **Pages** workflow as the deploy path.

In DNS, create a subdomain CNAME:

| Type | Name | Target | Proxy status |
| --- | --- | --- | --- |
| `CNAME` | your subdomain label | `<github-owner>.github.io` | DNS only |

Do not include the repository name in the CNAME target. For example, use `your-github-owner.github.io`, not `your-github-owner.github.io/your-repo`.

For Cloudflare, start with **DNS only** unless you deliberately add a Cloudflare proxy, Worker, or custom header layer later. When DNS is not proxied, GitHub Pages is responsible for the HTTPS certificate.

Verify DNS:

```bash
dig +short <your-domain> CNAME
```

Run the manual Pages workflow:

```bash
gh workflow run Pages --repo <owner>/<repo> --ref main -f deployment=<slug>
```

If using a deploy branch:

```bash
gh workflow run Pages --repo <owner>/<repo> --ref deploy/<slug> -f deployment=<slug>
```

## 5. Enforce HTTPS Without Stress

After DNS resolves, GitHub Pages needs to issue a certificate for the custom domain. This often takes a few minutes. GitHub's own documentation says the **Enforce HTTPS** option can take up to 24 hours to become available.

While the certificate is pending:

- `http://<your-domain>` may work;
- `https://<your-domain>` may show a certificate warning;
- GitHub Pages may show no certificate yet;
- this is normal and not a reason to redo the whole setup.

Check Pages state:

```bash
gh api repos/<owner>/<repo>/pages \
  --jq '{html_url,cname,https_enforced,protected_domain_state,https_certificate}'
```

When the certificate exists and GitHub allows it, enable **Enforce HTTPS** in GitHub Pages settings. Then verify:

```bash
curl -I https://<your-domain>/
```

## 6. Verify The Launch

Use this evidence checklist before inviting users:

- `BRINGA_DEPLOYMENT=<slug> pnpm check:config` passes.
- `pnpm check:secrets` passes.
- Supabase project ref and public URL are confirmed.
- Supabase Site URL and `/dashboard` redirect URL are exact.
- Google and/or GitHub OAuth providers are enabled.
- First admin is bootstrapped and has rotated or stored the invite code safely.
- If the setup-required login view appears, the deployment profile is corrected and config is regenerated.
- GitHub Pages deploy succeeded.
- DNS resolves to `<github-owner>.github.io`.
- HTTPS is enforced after the certificate is issued.
- A new OAuth user without an invite reaches `/invite`.
- A user with a valid invite reaches `/dashboard`.

## Agent Prompt

Fork operators can paste this into an agent:

```text
Set up this Bringa fork for https://share.example.org using GitHub owner <owner>, repository <repo>, and a fresh Supabase project. Keep secrets out of Git and public docs. Create or update the deployment profile, generate config, document the remaining dashboard steps, use the first-admin bootstrap helper after the intended admin signs in once, and verify GitHub Pages, DNS, HTTPS enforcement, OAuth, and the invite gate.
```

Agents must not paste Supabase secret keys, service-role keys, OAuth secrets, invite codes, Telegram tokens, real user rows, screenshots with secrets, or database passwords into commits, docs, issues, pull requests, or chat.

## Source References

- [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages custom domains overview](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase GitHub OAuth](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Cloudflare subdomain DNS](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-subdomain/)
