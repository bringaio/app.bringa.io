# Configuration

Public deployment settings live in `config/bringa.config.jsonc`.

Run:

```bash
pnpm generate:config
```

This writes:

- `public/bringa.config.json` for runtime/public inspection.
- `src/config/bringa.config.generated.json` for typed app imports.

Run:

```bash
pnpm check:config
```

Use `.env.local` for secrets and deployment-specific values that must not be public. Service role keys never belong in JSONC config.

## Common Fork Fields

- `app.name`, `app.shortName`, `branding.logoText`: visible app identity.
- `operator.defaultOwnerLabel`: default owner label for operator-owned items.
- `repository.url`, `repository.issuesUrl`: GitHub links shown in the app.
- `legal.termsPath`, `legal.publicDomainIntent`: legal routing and contribution intent.
- `media.*`: accepted image types and upload/compression limits.
- `features.*`: public feature switches.
