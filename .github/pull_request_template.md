## Summary

<!-- What changed, and why? -->

## Verification

- [ ] `pnpm check:config`
- [ ] `pnpm check:copy` when English docs/source-of-truth copy changes
- [ ] `pnpm check:supabase-contract` when Supabase-facing behavior changes
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build` when build behavior may be affected
- [ ] Focused lint or documented full-lint status when relevant

## Source Of Truth

- [ ] Public deployment settings stay in config.
- [ ] Secrets are not committed, logged, or documented.
- [ ] Durable developer conventions are documented in `docs/`.
- [ ] Agent-relevant conventions are reflected in `.agents/`.

## Fork Impact

- [ ] Fork-specific config, legal text, and brand assets remain easy to preserve.
- [ ] Any migration or breaking change is described clearly.
- [ ] This branch can be deleted after merge.
