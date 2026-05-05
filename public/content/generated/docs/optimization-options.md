# Optimization Options

This file is the living roadmap and anti-roadmap for ideas discovered by users and agents. Keep it compact. Remove completed items once implementation, tests, docs, or git history become the source of truth.

## How To Record Ideas

- Add modularization, refactoring, documentation, test, accessibility, performance, reliability, security, observability, and developer-experience opportunities here when they are useful but outside the current task.
- Include likely impact, affected area, uncertainty, possible side effects, and research needs when those are not obvious.
- Record feedback even when a user declines or defers an idea. This keeps the anti-roadmap visible in future sessions.
- Keep the current task central. Do not expand scope just because an optimization was noticed.
- Remove entries when implementation, tests, docs, or agent rules become the durable source of truth.

## Active Goal Candidates

- First open-source release evidence closure: finish browser evidence, repository UI checks, live Supabase review, restore drills, and external observability decisions before making a production-readiness claim. Impact: prevents proxy checks from being mistaken for live readiness. Uncertainty/research: requires approved access to repository settings, Supabase, and browser/platform evidence.
- Supabase contract alignment: reconcile `supabase/schema.sql`, migrations, client code, Storage buckets, edge functions, and generated docs into one enforceable contract. Impact: security, reliability, and maintainability. Uncertainty/research: requires Supabase MCP or service-role access, but real row contents must not be inspected without explicit user approval.
- Supabase development branch activation: use the documented branch task list to point local development at a Supabase development branch from production once access exists. Impact: safer live-adjacent testing without editing production directly. Uncertainty/research: confirm plan support, branch data policy, Auth/Storage/Edge Function behavior, and project refs with approved access.
- Supabase integrity verifier coverage: extend the local checker as moderation, notification, export, cleanup, and ownership RPC contracts land. Impact: catches data-integrity regressions before live migrations. Uncertainty/research: confirm live-project drift and migration order with Supabase metadata before applying production changes.
- RLS-safe mutations: move invite application, borrow/return, admin promotion, admin edits, moderation, deletion, and visibility changes behind RPCs where direct client table updates create weak or contradictory policies. Impact: protects data invariants and makes UI behavior testable. Side effect: migrations and UI calls must land in a careful sequence.
- Storage and upload hardening: align create/edit upload validation, server-side bucket limits, MIME allowlists, max size, compression behavior, image cleanup, and image export. Impact: security, performance, and user trust. Uncertainty/research: verify current Supabase Storage controls from official docs before implementation.

## Product Model

- Item ownership: wire prepared `owner_kind`, `owner_profile_id`, and `owner_label` through RPCs and UI for operator-owned, profile-owned, and free-text owner cases. Impact: deletion, visibility, export, and legal meaning become explicit. Uncertainty/research: legal wording for "private gift to the portal" needs operator review.
- User deletion behavior: preserve operator-owned items, hide user-owned or free-owner items, keep admin recovery/edit paths, and define Storage retention. Impact: privacy and continuity. Uncertainty/research: Auth deletion hooks and data export requirements need Supabase verification.
- Profile scope: profiles are not versioned, but may later support avatars, links, contact info, public pages, and profile moderation. Impact: community trust and accountability. Uncertainty/research: decide what profile data is public by default.
- Public-domain intent: users should feel that item entries and images are a private gift to the portal and intended for the commons. Impact: clear contribution culture. Uncertainty/research: CC0/public-domain fallback wording must stay deployment-specific and non-legal-advice.

## Media

- Multiple item images: wire prepared `item_images` metadata into uploads with immediate previews, chronological ordering with newest first, cover image selection, captions, alt text, and per-image deletion. Impact: better item quality and accessibility. Side effect: the current single `image_url` model will need migration.
- User-contributed images: allow users to propose images for items they did not create, with admin or owner review. Impact: community improvement without losing moderation. Uncertainty/research: decide whether accepted images inherit the item's public-domain intent.
- Image flagging: support flags for individual item images and possibly profile images. Impact: safer public galleries. Side effect: requires admin queue and notification policy.
- Deleted item images: define whether images remain in a user's export/gallery after an item is deleted or hidden. Impact: privacy, storage cost, and user expectations. Uncertainty/research: needs legal and operator policy.
- File type policy: keep JPEG, PNG, and WebP as the default; explicitly decide whether animated GIFs are rejected, flattened, or supported. Impact: security and performance. Uncertainty/research: animated media processing needs current tooling and abuse review.
- Oversized upload bypass: enforce server-side limits in addition to frontend compression. Impact: prevents browser-bug or intentional bypass. Uncertainty/research: requires Supabase Storage policy and possibly edge-function processing review.

## User And Admin Workflows

- Search actions: revisit buttons above the search field as compact icon/segmented controls with accessible labels and stable responsive dimensions. Impact: mobile scanning and repeated use. Uncertainty/research: needs browser testing across viewport sizes.
- Moderation follow-through: build on suggestion/flag creation, review RPCs, content/image/owner suggestion application, and the Telegram notification state contract with item/image-specific moderation, user-facing notification history, and operator retry jobs if needed. Impact: community quality without broad browser writes. Uncertainty/research: full image moderation semantics and live notification delivery need operator review.
- Invite and onboarding: build on the tested invite page and profile completion helpers, then decide whether display name comes before invite code. Impact: smoother onboarding and moderation. Side effect: auth/profile routes and RPCs need alignment.
- User data export and deletion processing: build on the prepared user JSON export, deletion-request RPC, admin review queue, database-side completion stage, and trusted cleanup helper with live rehearsal, Storage path evidence, retention policy, suggestions/flags, and image metadata. Impact: trust and portability. Uncertainty/research: requires Supabase Auth/Storage policy review and legal/operator retention decisions.

## App Experience

- Responsive and browser QA: test mobile, tablet, desktop, touch, keyboard, Safari, Firefox, Chromium, installed PWA, slow network, empty states, long names, long words, and image-heavy lists. Impact: accessibility and reliability. Uncertainty/research: use the documented browser runbook and agentic browser skills first; add packages only after explicit decision.
- PWA polish: build on the config-driven, tested manifest and PNG/maskable install icons by adding Apple touch icon platform verification, offline behavior review, update behavior, installed auth persistence, and logout testing. Impact: mobile trust. Uncertainty/research: current browser/platform behavior must be tested.
- Typography and FOUT/FOUC: document system-font choice or self-hosted font policy; verify first paint and theme flash. Impact: perceived quality and performance. Uncertainty/research: needs visual QA.
- Routes and navigation: evaluate breadcrumbs for deep item/admin/profile routes, and keep primary mobile navigation predictable. Impact: wayfinding without clutter. Side effect: avoid adding navigation chrome that competes with core borrowing flow.
- Markdown or rich descriptions: decide between plain text, safe Markdown, or constrained formatting for item descriptions. Impact: usefulness and XSS risk. Uncertainty/research: package/tool choice requires current best-practice check.
- Internationalization: centralize user-facing copy, keep English primary with German available, and maintain a glossary for ambiguous domain terms. Impact: fork readiness. Side effect: avoid large i18n framework unless it earns its complexity.

## Operations

- Telegram operations: add an operator retry job for failed sends if manual retry planning through `notification_events.next_attempt_at` is not enough. Impact: admin attention and reliability. Uncertainty/research: confirm deployment volume and failure modes with live Edge Function logs.
- Backups: table and Storage backup script exists with optional Auth metadata export, admin-visible freshness metadata, local manifest/hash verifier, and checked restore-drill evidence runbook; add live restore drills and encrypted retention policy. Impact: recovery confidence. Uncertainty/research: service role scope, Supabase Auth restore limits, and Storage reconciliation details need live-project verification after setup.
- Observability: privacy-preserving diagnostics and log boundaries are now documented and checked; finish live Supabase health checks, Edge Function log review, and the explicit external error-reporting decision. Impact: diagnose failures without exposing user data. Uncertainty/research: choose minimal tools and avoid unnecessary tracking.
- Maintenance tasks: keep reminders for Supabase free-tier activity, dependency updates, config schema checks, docs review, browser-test skill updates, and fork sync research. Impact: operations stay humane.

## Developer Experience

- Test strategy: extend focused tests beyond config generation, OAuth redirect helpers, login terms gating, app-config helpers, admin route gates, media policy helpers, protected-route decisions, invite flow helpers, profile completion helpers, settings data actions, and Supabase contract checker behavior to more critical UI states. Impact: safer refactors. Side effect: respect the user's preference for agentic browser skills before adding browser-test packages.
- Static export verifier growth: expand `pnpm check:static-export` if the app adds generated route handlers, custom export paths, or deployment-specific hosting rules. Impact: preserves the static-export architecture while Next.js evolves. Uncertainty/research: use current Next.js docs before broadening the checker.
- Major dependency upgrades: review Node 25 runtime/types, ESLint, and TypeScript major updates with current official docs before upgrading. Impact: keeps tooling current without avoidable breakage. Uncertainty/research: confirm runtime Node policy, lint migration path, and compiler changes.
- Source-of-truth comments: where duplication is unavoidable, add a nearby note naming the canonical file. Impact: prevents future drift.
- Generated backend config: media MIME and size limits currently exist in resolved deployment config and Supabase Storage SQL; `pnpm check:supabase-contract` checks the committed schema. Impact: reduces deployment drift if future tooling generates backend settings from config. Uncertainty/research: wait until Supabase MCP confirms live bucket metadata and migration workflow.
- Deployment profile generator growth: consider optional flags that also scaffold deployment content directories, brand asset placeholders, and a CNAME file once real fork usage shows repeated friction. Impact: makes fork onboarding smoother without forcing unused files into every operator setup. Uncertainty/research: observe first fork setup and GitHub Pages custom-domain behavior before expanding the script.
- Agent skill growth: when repeated friction appears, update `.agents/` and this register rather than relying on memory. Impact: future sessions start stronger.
- In-app docs polish: keep generated docs minimal, elegant, searchable, and directly available through the app. Impact: developers can understand setup, operations, and contribution paths quickly.
- Share-worthy improvements: when a change would benefit other open-source app maintainers, consider adding it to release notes, social posts, or mailing-list material. Impact: community growth. Side effect: avoid marketing noise inside the product UI.

## Deferred Until Explicit Decision

- Full federated/decentralized peer-to-peer architecture.
- Separate Astro repository for the public `bringa.io` home page.
- Full role-switch impersonation beyond the local demo fixture identities. This needs a security design before implementation.
- Merge queue. Consider only after the repository has enough PR volume to justify it.
- Installing Playwright or other browser-test packages. Prefer agentic browser skills unless the user explicitly chooses package-based automation.

## Questions Waiting For User

- Should `pnpm create:deployment` also create deployment-specific content and brand asset folders, or should it stay focused on one profile file until forks prove the need?
- Should GIF uploads be rejected, flattened to still WebP, or supported as animated media?
- Which SSO providers beyond GitHub and Google should be supported first?
- Should item contributions use CC0 wording, a public-domain dedication plus fallback license, or only deployment-specific legal text?
- Which admin actions require Telegram notifications, and when should notification muting reset?
- Should user profiles be public by default, private by default, or fork-configurable?
- Should item location ever be visible to borrowers, or remain private to owner/admin only?

## Hyperoptimum Reminder

The best next step is not the largest possible step. Prefer changes that make future correct work easier, preserve privacy, reduce ambiguity, and keep the repository pleasant for humans and agents.
