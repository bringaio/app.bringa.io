---
title: Dependency Audit
---

# Dependency Audit

Use current package metadata and official documentation before dependency upgrades. Do not update major framework, compiler, lint, or UI-library versions just because they exist.

## 2026-05-04 Registry Check

`pnpm outdated` found these available updates:

| Package | Current | Latest | Decision |
| --- | ---: | ---: | --- |
| `react` | `19.2.0` | `19.2.5` | Applied as patch update. |
| `react-dom` | `19.2.0` | `19.2.5` | Applied as patch update. |
| `@tailwindcss/postcss` | `4.2.2` | `4.2.4` | Applied as patch update. |
| `tailwindcss` | `4.2.2` | `4.2.4` | Applied as patch update. |
| `@supabase/supabase-js` | `2.104.0` | `2.105.3` | Applied as same-major update. |
| `supabase` | `2.92.1` | `2.98.1` | Applied as same-major CLI update. |
| `lucide-react` | `0.552.0` | `1.14.0` | Applied after Context7 docs confirmed named React component imports and SVG props remain supported, and registry metadata confirmed React 19 peer support. |
| `@types/node` | `20.19.39` | `25.6.0` | Defer; align types with the Node runtime policy, not latest Node release. |
| `eslint` | `9.39.4` | `10.3.0` | Defer; major lint stack update needs official migration review. |
| `typescript` | `5.9.3` | `6.0.3` | Defer; major compiler update needs official migration review. |

## Security Audit

`pnpm audit --audit-level moderate` found a moderate PostCSS advisory through Next.js. Next.js was already current at `16.2.4`, so the repository pins a pnpm override for `postcss@8.5.14`, matching the patched version already used by Tailwind. After the override, `pnpm audit --audit-level moderate` reports no known vulnerabilities.

## Upgrade Policy

- Patch and same-major updates are acceptable when they pass config, Supabase contract, lint, TypeScript, and build checks.
- Major updates need a focused branch, current official docs or Context7 review, and a rollback plan.
- Security overrides should be narrow, documented, and removed once upstream dependencies no longer need them.
- Node type packages should match the runtime and CI Node version.
- UI icon library major updates need TypeScript, lint, static build, and focused browser review for imported icon surfaces.
- Keep `pnpm-lock.yaml` and `package.json` together in the same commit.

After applying the compatible updates and the reviewed `lucide-react` major update, `pnpm outdated` only lists deferred Node type, ESLint, and TypeScript major-version work.
