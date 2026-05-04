# Fork Upgrade Workflow

Use this when bringing upstream `bringaio/app.bringa.io` changes into a fork such as a CONTEKT deployment.

1. Identify upstream changes, fork-specific config, migrations, and legal/branding files.
2. Classify each change as safe, breaking, migration-required, or fork-specific conflict.
3. Preserve fork config in `config/bringa.config.jsonc` and deployment secrets in environment variables.
4. Read migrations before applying them. Never run production migrations without an approved backup and rollback plan.
5. Prefer small PRs: config/docs, frontend behavior, database changes, and legal text should be reviewable separately.
6. Record unresolved fork decisions in `docs/optimization-options.md`.
