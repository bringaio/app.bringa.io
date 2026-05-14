import assert from "node:assert/strict";
import test from "node:test";

import { checkNamingConventionsContent, extractMarkdownSections } from "./check-naming-conventions.mjs";

test("extracts naming convention sections", () => {
  const sections = extractMarkdownSections(`# Conventions

## Git And Pull Requests
Git text.

## Naming Conventions
Naming text.
`);

  assert.deepEqual(sections, new Map([
    ["Git And Pull Requests", "Git text."],
    ["Naming Conventions", "Naming text."],
  ]));
});

test("accepts conventions that document source naming patterns", () => {
  assert.doesNotThrow(() => checkNamingConventionsContent(`
# Conventions

## Git And Pull Requests

- Use Conventional Commits.
- Work from a branch or fork. Do not commit directly to \`main\` for normal development.
- \`codex/<type>-<topic>\` for agent-created upstream work.
- \`<type>/<topic>\` for human community pull requests.
- \`deploy/<deployment-slug>\` for optional long-lived fork deployment branches.

## Source Of Truth

- Every durable fact should have one home.

## Naming Conventions

- React component exports use PascalCase.
- Component filenames under \`src/components/\` use kebab-case.
- Hooks use \`useX\` names and may keep camelCase filenames such as \`src/hooks/useAuth.tsx\`.
- App Router route folders use lowercase or kebab-case segments.
- Utility and domain modules under \`src/lib/\` use kebab-case filenames.
- Config keys use lower camelCase.
- Supabase tables, columns, enums, policies, and RPC function names use snake_case.
- Supabase migrations use \`YYYYMMDDHHMMSS_snake_case.sql\`.
- Edge Function directory names use kebab-case; preserve legacy deployed names until a migration plan exists.
- Scripts under \`scripts/\` use kebab-case and pair checkers with \`.test.mjs\` when behavior is not trivial.
- Environment templates use \`.env.example\`; developer-local secrets and maintenance keys stay in ignored \`.env.local\`.
- Branches and commits follow the Git And Pull Requests section.
`));
});

test("rejects conventions that omit database naming", () => {
  assert.throws(
    () => checkNamingConventionsContent(`
# Conventions

## Git And Pull Requests

- Use Conventional Commits.
- Work from a branch or fork. Do not commit directly to \`main\` for normal development.
- \`codex/<type>-<topic>\` for agent-created upstream work.
- \`<type>/<topic>\` for human community pull requests.
- \`deploy/<deployment-slug>\` for optional long-lived fork deployment branches.

## Source Of Truth

- Every durable fact should have one home.

## Naming Conventions

- React component exports use PascalCase.
- Component filenames under \`src/components/\` use kebab-case.
- Hooks use \`useX\` names and may keep camelCase filenames such as \`src/hooks/useAuth.tsx\`.
- App Router route folders use lowercase or kebab-case segments.
- Utility and domain modules under \`src/lib/\` use kebab-case filenames.
- Config keys use lower camelCase.
- Supabase migrations use \`YYYYMMDDHHMMSS_snake_case.sql\`.
- Edge Function directory names use kebab-case.
- Scripts under \`scripts/\` use kebab-case.
- Environment templates use \`.env.example\`; developer-local secrets and maintenance keys stay in ignored \`.env.local\`.
- Branches and commits follow the Git And Pull Requests section.
`),
    /Supabase tables, columns, enums, policies, and RPC function names use snake_case/,
  );
});

test("rejects conventions that omit agent branch naming", () => {
  assert.throws(
    () => checkNamingConventionsContent(`
# Conventions

## Git And Pull Requests

- Use Conventional Commits.
- Work from a branch or fork. Do not commit directly to \`main\` for normal development.
- \`<type>/<topic>\` for human community pull requests.
- \`deploy/<deployment-slug>\` for optional long-lived fork deployment branches.

## Source Of Truth

- Every durable fact should have one home.

## Naming Conventions

- React component exports use PascalCase.
- Component filenames under \`src/components/\` use kebab-case.
- Hooks use \`useX\` names and may keep camelCase filenames such as \`src/hooks/useAuth.tsx\`.
- App Router route folders use lowercase or kebab-case segments.
- Utility and domain modules under \`src/lib/\` use kebab-case filenames.
- Config keys use lower camelCase.
- Supabase tables, columns, enums, policies, and RPC function names use snake_case.
- Supabase migrations use \`YYYYMMDDHHMMSS_snake_case.sql\`.
- Edge Function directory names use kebab-case; preserve legacy deployed names until a migration plan exists.
- Scripts under \`scripts/\` use kebab-case and pair checkers with \`.test.mjs\` when behavior is not trivial.
- Environment templates use \`.env.example\`; developer-local secrets and maintenance keys stay in ignored \`.env.local\`.
- Branches and commits follow the Git And Pull Requests section.
`),
    /codex\/<type>-<topic>/,
  );
});
