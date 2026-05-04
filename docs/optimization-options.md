---
title: Optimization Options
---

# Optimization Options

This file is the living roadmap and anti-roadmap for ideas discovered by users and agents. Keep it compact. Remove completed items once the implementation or docs become the source of truth.

## How To Record Ideas

- Add modularization, refactoring, documentation, test, accessibility, performance, reliability, security, observability, and developer-experience opportunities here when they are useful but outside the current task.
- Include likely impact, affected area, uncertainty, possible side effects, and research needs when those are not obvious.
- Keep the current task central. Do not expand scope just because an optimization was noticed.
- Remove entries when implementation, tests, docs, or agent rules become the durable source of truth.

## Active Near-Term

- Quality loop: keep `docs/definition-of-done.md`, `.agents/workflows/quality-loop.md`, and CI aligned as the repository matures.
- Hyperoptimum stewardship: keep `docs/hyperoptimum.md`, `.agents/rules/core.md`, and `.agents/skills/hyperoptimum-stewardship/` aligned as the repository learns from future work.
- CI foundation: secret-free GitHub Actions checks are present, include quiet full lint, and publish docs from `main`; next step is applying branch protection and repository settings in GitHub.
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
