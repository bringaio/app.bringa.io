type SetupReadinessConfig = {
  app?: {
    canonicalUrl?: string;
  };
  repository?: {
    templateMode?: string;
  };
  supabase?: {
    url?: string;
    publishableKey?: string;
  };
  development?: {
    localDemoMode?: boolean;
  };
};

export type SetupReadinessIssue =
  | "placeholder-supabase-url"
  | "placeholder-publishable-key"
  | "local-supabase-production"
  | "upstream-origin-mismatch";

export type SetupReadinessStatus = "ready" | "checking" | "setup-required";

export type SetupReadinessResult = {
  status: SetupReadinessStatus;
  issues: SetupReadinessIssue[];
};

export type SetupRequiredCopy = {
  title: string;
  description: string;
  steps: string[];
  guideHref: string;
  docsHref: string;
};

function parseUrl(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname);
}

function isLocalOrigin(origin?: string | null) {
  const parsed = parseUrl(origin);
  return parsed ? isLocalHostname(parsed.hostname) : false;
}

function isPlaceholderSupabaseUrl(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.includes("replace-with-your-project-ref") || normalized.includes("replace-with");
}

function isPlaceholderPublishableKey(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.includes("replace-with") || normalized === "local-development-publishable-key";
}

function normalizedOrigin(value?: string | null) {
  return parseUrl(value)?.origin.toLowerCase() ?? null;
}

export function evaluateSetupReadiness({
  config,
  currentOrigin = null,
  nodeEnv = process.env.NODE_ENV,
}: {
  config: SetupReadinessConfig;
  currentOrigin?: string | null;
  nodeEnv?: string;
}): SetupReadinessResult {
  if (nodeEnv !== "production") {
    return { status: "ready", issues: [] };
  }

  const issues: SetupReadinessIssue[] = [];
  const supabaseUrl = config.supabase?.url;
  const supabasePublishableKey = config.supabase?.publishableKey;
  const parsedSupabaseUrl = parseUrl(supabaseUrl);

  if (isPlaceholderSupabaseUrl(supabaseUrl)) {
    issues.push("placeholder-supabase-url");
  }

  if (isPlaceholderPublishableKey(supabasePublishableKey)) {
    issues.push("placeholder-publishable-key");
  }

  if (parsedSupabaseUrl && isLocalHostname(parsedSupabaseUrl.hostname)) {
    issues.push("local-supabase-production");
  }

  const canonicalOrigin = normalizedOrigin(config.app?.canonicalUrl);
  const servedOrigin = normalizedOrigin(currentOrigin);
  const needsOriginCheck = config.repository?.templateMode === "upstream" && Boolean(canonicalOrigin);

  if (needsOriginCheck && !servedOrigin && issues.length === 0) {
    return { status: "checking", issues: [] };
  }

  if (
    needsOriginCheck &&
    servedOrigin &&
    canonicalOrigin &&
    servedOrigin !== canonicalOrigin &&
    !isLocalOrigin(servedOrigin)
  ) {
    issues.push("upstream-origin-mismatch");
  }

  return issues.length > 0
    ? { status: "setup-required", issues }
    : { status: "ready", issues: [] };
}

export function buildSetupRequiredCopy(): SetupRequiredCopy {
  return {
    title: "Setup required",
    description: "This deployment is not connected to its own Supabase project yet.",
    steps: [
      "Configure the fork deployment profile.",
      "Connect Supabase, OAuth, and the first admin.",
      "Publish with GitHub Pages, DNS, and enforced HTTPS.",
    ],
    guideHref: "/docs?doc=fork-launch-runbook",
    docsHref: "/docs",
  };
}
