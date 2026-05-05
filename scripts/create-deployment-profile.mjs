import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slugPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const publicSupabaseUrlPlaceholder = "https://replace-with-your-project-ref.supabase.co";
const publicSupabaseKeyPlaceholder = "replace-with-your-public-publishable-key";

function json(value) {
  return JSON.stringify(value);
}

function usage() {
  return `Usage: pnpm create:deployment -- <deployment-slug> [options]

Creates config/deployments/<deployment-slug>.jsonc for a fork or local operator.

Options:
  --owner <github-owner>              GitHub owner for repository links
  --repo <github-repo>                GitHub repository name
  --operator <name>                   Operator name shown in app defaults
  --canonical-url <url>               Public app URL, defaults to https://<slug>
  --supabase-url <url>                Public Supabase project URL
  --supabase-publishable-key <key>    Public Supabase publishable key
  --force                             Replace an existing profile
  --help                              Show this help
`;
}

function optionValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${optionName}.`);
  }
  return value;
}

function defaultGithubOwner(env = process.env) {
  return env.GITHUB_REPOSITORY_OWNER?.trim() || env.GITHUB_REPOSITORY?.split("/")?.[0] || "replace-with-your-github-owner";
}

function defaultGithubRepo(env = process.env) {
  return env.GITHUB_REPOSITORY?.split("/")?.[1] || "app.bringa.io";
}

function normalizeUrl(value, pathName) {
  const trimmed = value.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Expected http or https.");
    }
  } catch {
    throw new Error(`Expected ${pathName} to be an http(s) URL.`);
  }
  return trimmed;
}

export function normalizeDeploymentSlug(value) {
  const slug = value?.trim();
  if (!slug || !slugPattern.test(slug)) {
    throw new Error(
      "Expected deployment slug to start with a letter or number and contain only letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return slug;
}

export function buildDeploymentProfileContent({
  slug,
  githubOwner = defaultGithubOwner(),
  githubRepo = defaultGithubRepo(),
  operatorName = slug,
  canonicalUrl = `https://${slug}`,
  supabaseUrl = publicSupabaseUrlPlaceholder,
  supabasePublishableKey = publicSupabaseKeyPlaceholder,
} = {}) {
  const normalizedSlug = normalizeDeploymentSlug(slug);
  const normalizedCanonicalUrl = normalizeUrl(canonicalUrl, "canonicalUrl");
  const normalizedSupabaseUrl = normalizeUrl(supabaseUrl, "supabase.url");
  const owner = githubOwner.trim();
  const repo = githubRepo.trim();
  const operator = operatorName.trim() || normalizedSlug;

  if (!owner || !repo) {
    throw new Error("Expected githubOwner and githubRepo to be non-empty strings.");
  }

  const repositoryUrl = `https://github.com/${owner}/${repo}`;
  const shortName = normalizedSlug.split(/[._-]/).find(Boolean) || normalizedSlug;

  return `{
  // Fork deployment profile. Commit this file in your fork and keep
  // secrets in ignored env files, GitHub secrets, or Supabase function secrets.
  "app": {
    "name": ${json(normalizedSlug)},
    "shortName": ${json(shortName.slice(0, 12))},
    "titleTemplate": ${json(`%s | ${normalizedSlug}`)},
    "canonicalUrl": ${json(normalizedCanonicalUrl)}
  },
  "branding": {
    "logoText": ${json(normalizedSlug)},
    "bornAndHostedBy": ${json(`Hosted by ${operator}`)}
  },
  "operator": {
    "organizationName": ${json(operator)},
    "defaultOwnerLabel": ${json(operator)}
  },
  "repository": {
    "provider": "github",
    "owner": ${json(owner)},
    "name": ${json(repo)},
    "url": ${json(repositoryUrl)},
    "issuesUrl": ${json(`${repositoryUrl}/issues`)},
    "templateMode": "fork"
  },
  "supabase": {
    // These are public browser settings, not secrets. Replace them before
    // building a connected deployment.
    "url": ${json(normalizedSupabaseUrl)},
    "publishableKey": ${json(supabasePublishableKey)}
  },
  "development": {
    "localDemoMode": true
  }
}
`;
}

export async function createDeploymentProfile({
  root = defaultRoot,
  slug,
  force = false,
  ...profileOptions
} = {}) {
  const normalizedSlug = normalizeDeploymentSlug(slug);
  const filePath = path.join(root, "config", "deployments", `${normalizedSlug}.jsonc`);
  const relativePath = path.relative(root, filePath).split(path.sep).join("/");
  const content = buildDeploymentProfileContent({ slug: normalizedSlug, ...profileOptions });

  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await writeFile(filePath, content, { flag: force ? "w" : "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`${relativePath} already exists. Use --force to replace it.`);
    }
    throw error;
  }

  return {
    slug: normalizedSlug,
    filePath,
    relativePath,
  };
}

export function parseArgs(args, env = process.env) {
  const options = {
    githubOwner: defaultGithubOwner(env),
    githubRepo: defaultGithubRepo(env),
    force: false,
  };
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    const value = optionValue(args, index, arg);
    index += 1;

    if (arg === "--owner") {
      options.githubOwner = value;
    } else if (arg === "--repo") {
      options.githubRepo = value;
    } else if (arg === "--operator") {
      options.operatorName = value;
    } else if (arg === "--canonical-url") {
      options.canonicalUrl = value;
    } else if (arg === "--supabase-url") {
      options.supabaseUrl = value;
    } else if (arg === "--supabase-publishable-key") {
      options.supabasePublishableKey = value;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (positional.length !== 1) {
    throw new Error("Expected exactly one deployment slug.");
  }

  return {
    slug: positional[0],
    ...options,
  };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    process.stdout.write(usage());
    return;
  }

  const result = await createDeploymentProfile(parsed);
  console.log(`Created ${result.relativePath}.`);
  console.log(`Next: BRINGA_DEPLOYMENT=${result.slug} pnpm generate:config`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    console.error("");
    console.error(usage().trimEnd());
    process.exitCode = 1;
  });
}
