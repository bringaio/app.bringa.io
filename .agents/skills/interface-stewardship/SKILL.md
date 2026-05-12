---
name: interface-stewardship
description: Use when changing UI, layout, styling, user-facing copy, brand surfaces, or admin/user experience in this repository.
---

# Interface Stewardship

Use this skill for product UI, admin UI, copy, layout, theme, and brand-facing changes.

## Read First

- `docs/hyperoptimum.md`
- `docs/configuration.md`
- `docs/fork-content-strategy.md`
- `src/app/globals.css`
- Nearby components and routes before inventing new patterns

## Principles

- Treat this as the generic `app.bringa.io` upstream. Operator-specific branding, legal text, links, and local copy belong in config or fork-owned content.
- Build the actual app experience, not a marketing placeholder.
- Keep operational surfaces quiet, dense, scannable, and accessible.
- First-run and setup-required states should explain the next operator action and link to docs without exposing secrets or loading unavailable backend clients.
- Prefer existing Tailwind, component, and `lucide-react` patterns.
- Keep copy compact, direct, kind, and translatable.
- Use stable dimensions for repeated controls, cards, counters, toolbars, and navigation.
- Avoid nested cards, decorative background blobs, one-note palettes, and text that can overflow its container.
- Check keyboard flow, focus states, touch targets, contrast, empty states, long names, long words, and mobile layouts.

## Admin Experience

- Optimize for quick diagnosis and safe action.
- Show status, counts, queues, and recent activity before deep detail.
- Admin actions should make scope and consequences explicit.
- Do not expose personal data in summaries when a link to the app can preserve privacy.

## When Something Does Not Fit

Record the opportunity in `docs/optimization-options.md` with impact and uncertainty instead of broadening the current task.
