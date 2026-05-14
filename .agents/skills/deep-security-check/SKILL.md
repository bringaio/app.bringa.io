---
name: deep-security-check
description: Use when the user asks for a deep security check, DeepSec scan, agent-powered vulnerability scan, or security review that should use https://github.com/vercel-labs/deepsec with Codex or Claude.
---

# Deep Security Check

Use DeepSec as a temporary security harness, not as durable repository state.

## Workflow

1. Verify the upstream project before installing:
   - Open or otherwise check https://github.com/vercel-labs/deepsec.
   - Prefer the current upstream README and docs, especially `docs/getting-started.md`, over remembered commands.
2. Create a short-lived branch unless the user explicitly asks for local-only or mainline maintenance.
3. Install DeepSec from the repository root following the upstream docs:
   - Run the documented initializer, currently `npx deepsec init`, which creates `.deepsec/`.
   - Install dependencies inside `.deepsec/` as documented.
   - Read `.deepsec/node_modules/deepsec/SKILL.md`.
   - Read `.deepsec/data/<project-id>/SETUP.md` and fill `.deepsec/data/<project-id>/INFO.md` with compact, project-specific context.
4. Use DeepSec with the AI backend the user approved:
   - Follow DeepSec's docs for Codex or Claude subscription usage.
   - If the requested scan is large or could be expensive, state the likely cost/latency risk before running full AI processing.
   - Prefer a smaller `--limit` or diff-focused run when the user's request is exploratory or budget-sensitive.
5. Run the useful DeepSec commands for the task, such as scan, process, triage, revalidate, report, or export, based on the current docs.
6. Triage findings against the codebase before proposing fixes. Do not blindly accept tool output.
7. Preserve only distilled results that belong in the repository:
   - Implement accepted fixes in normal source files.
   - Record deferred security work in `docs/optimization-options.md`.
   - Do not commit raw DeepSec run state, generated findings, credentials, or bulky artifacts.
8. Before finishing, delete `.deepsec/` completely and verify it is gone:
   - Remove tracked files if any were added.
   - Remove ignored generated data as well.
   - Confirm `git ls-files .deepsec` is empty and `.deepsec/` does not exist.

## Safety

- Treat DeepSec like a coding agent with shell access to this workspace.
- Keep secrets out of DeepSec config, prompts, reports, chat, commits, and screenshots.
- Do not inspect real Supabase rows or private exports for a DeepSec run unless the user explicitly approves that data access for the current task.
- Keep the final worktree clean: no `.deepsec/`, no raw security artifacts, and no temporary credentials.
