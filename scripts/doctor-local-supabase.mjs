import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { stdout as defaultOutput } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { removeTrailingCommas, stripComments } from "./generate-config.mjs";
import { resolveLocalPublicSupabaseConfig } from "./setup-local-supabase.mjs";
import { isLocalSupabaseUrl, parseSupabaseStatusEnv } from "./seed-local-supabase.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localConfigRelativePath = path.join("config", "local.config.jsonc");

function usage() {
  return `Usage: pnpm doctor:local-supabase

Checks whether the local Supabase CLI stack is running and whether the ignored
config/local.config.jsonc points at it without printing Supabase keys.

Run pnpm exec supabase start before this command.
`;
}

function getLocalConfigPath(root) {
  return path.join(root, localConfigRelativePath);
}

function getStatusResultFromCli(root) {
  return spawnSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
    cwd: root,
    encoding: "utf8",
  });
}

function resolveStatusEnv({ root, statusEnv, statusResult }) {
  if (statusEnv) return statusEnv;

  const result = statusResult || getStatusResultFromCli(root);
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(
      `Could not read local Supabase status. Run \`pnpm exec supabase start\` first.${detail ? `\n${detail}` : ""}`,
    );
  }

  return parseSupabaseStatusEnv(result.stdout);
}

async function readLocalConfig(root) {
  try {
    const content = await readFile(getLocalConfigPath(root), "utf8");
    return JSON.parse(removeTrailingCommas(stripComments(content)));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Could not parse ${localConfigRelativePath}: ${error.message}`);
  }
}

function inspectLocalConfig(localConfig, expectedConfig) {
  if (!localConfig) {
    return {
      state: "missing",
      issues: [`${localConfigRelativePath} is missing.`],
    };
  }

  const issues = [];
  const configuredUrl = String(localConfig.supabase?.url || "").trim();
  const configuredKey = String(localConfig.supabase?.publishableKey || "").trim();
  const configuredDemoMode = localConfig.development?.localDemoMode;

  if (!isLocalSupabaseUrl(configuredUrl)) {
    issues.push(`${localConfigRelativePath} does not point at a local Supabase URL.`);
  } else if (configuredUrl !== expectedConfig.supabase.url) {
    issues.push(`${localConfigRelativePath} does not match the running local stack URL.`);
  }

  if (!configuredKey) {
    issues.push(`${localConfigRelativePath} is missing a public publishable key.`);
  } else if (configuredKey !== expectedConfig.supabase.publishableKey) {
    issues.push(`${localConfigRelativePath} publishableKey does not match the running local stack.`);
  }

  if (configuredDemoMode !== false) {
    issues.push(`${localConfigRelativePath} development.localDemoMode should be false when using local Supabase.`);
  }

  return {
    state: issues.length ? "drift" : "ready",
    issues,
  };
}

function writeReport(output, { expectedConfig, localConfig }) {
  if (localConfig.state === "ready") {
    output.write(`Local Supabase doctor passed.
- API URL: ${expectedConfig.supabase.url}
- Public key: present
- Local app config: ${localConfigRelativePath} is ready

Next: BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
`);
    return;
  }

  output.write(`Local Supabase stack is running.
- API URL: ${expectedConfig.supabase.url}
- Public key: present
- Local app config: ${localConfig.state}
`);

  for (const issue of localConfig.issues) {
    output.write(`- ${issue}\n`);
  }

  output.write(`
Run: pnpm setup:local-supabase --seed
Then: BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
`);
}

export async function doctorLocalSupabase({
  root = defaultRoot,
  env = process.env,
  output = defaultOutput,
  statusEnv,
  statusResult,
} = {}) {
  const resolvedStatusEnv = resolveStatusEnv({ root, statusEnv, statusResult });
  const expectedConfig = resolveLocalPublicSupabaseConfig({ env, statusEnv: resolvedStatusEnv });
  const localConfig = inspectLocalConfig(await readLocalConfig(root), expectedConfig);
  const ok = localConfig.state === "ready";

  writeReport(output, {
    expectedConfig,
    localConfig,
  });

  return {
    ok,
    apiUrl: expectedConfig.supabase.url,
    localConfig,
  };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(usage());
    return;
  }

  const result = await doctorLocalSupabase();
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    console.error("");
    console.error(usage().trimEnd());
    process.exitCode = 1;
  });
}
