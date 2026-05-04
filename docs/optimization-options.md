# Optimization Options

This file is the living roadmap and anti-roadmap for ideas discovered by users and agents. Keep it compact. Remove completed items once the implementation or docs become the source of truth.

## Active Near-Term

- Quality loop: keep `docs/definition-of-done.md`, `.agents/workflows/quality-loop.md`, and CI aligned as the repository matures.
- CI foundation: add required secret-free GitHub Actions checks, then protect `main` once the workflow is stable.
- Supabase hardening: verify schema, RLS, triggers, Storage policies, Auth redirects, invite RPC, deletion behavior, admin edits, and Telegram throttling after MCP/service-role setup.
- Item ownership: model operator-owned, profile-owned, and free-text owner cases; enforce visibility after user deletion.
- Images: multiple images, immediate previews, size/type limits, Storage cleanup, title image, newest-first ordering, per-image flags, and download/export behavior.
- Dashboard default: show borrowed items only when the user actually has borrowed items; otherwise show available items.
- Agent docs: keep `.agents/` concise and improve skills whenever repeated friction appears.
- Documentation in app: expose docs, repo links, issue prompt template, roadmap, and "Born and hosted by bringa.io" without cluttering core workflows.

## Deferred Until Explicit Decision

- Full item versioning and admin restore flow.
- Profile pages, profile images, public contact links, and profile moderation.
- Federated/decentralized peer-to-peer architecture.
- GitHub Template mode as primary distribution model; current default is upstream-plus-forks.
- Dev-mode auth bypass and impersonation. This needs a security design before implementation.
- Merge queue. Consider only after the repository has enough PR volume to justify it.

## Questions Waiting For User

- What is the default operator label for the first CONTEKT fork: `CONTEKT`, `CONTEKT Technikerverein`, or another legal name?
- Should GIF uploads be allowed as animated images, flattened to a still WebP, or rejected?
- Which SSO providers beyond GitHub and Google should be supported first?
- Should item contributions use CC0 wording, a public-domain dedication plus fallback license, or a deployment-specific legal text per fork?
- Which admin actions require Telegram notifications, and when should notification muting reset?

## Hyperoptimum Reminder

The best next step is not the largest possible step. Prefer changes that make future correct work easier, preserve privacy, reduce ambiguity, and keep the repository pleasant for humans and agents.
