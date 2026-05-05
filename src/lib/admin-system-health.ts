export type AdminSystemHealthInput = {
  repositoryUrl: string;
  telegramAdminNotifications: boolean;
  maxUploadBytes: number;
  acceptedImageMimeTypes: string[];
  latestBackupRun?: AdminBackupRun | null;
  now?: Date;
};

export type AdminBackupRun = {
  status: string | null;
  finished_at: string | null;
  table_count: number | null;
  table_rows: number | null;
  storage_bucket_count: number | null;
  storage_object_count: number | null;
  storage_bytes: number | null;
  auth_users_exported: boolean | null;
  auth_user_count: number | null;
};

export type AdminSystemHealthItemKey =
  | "config"
  | "supabase"
  | "storage"
  | "devBranch"
  | "backups"
  | "docs"
  | "telegram";

export type AdminSystemHealthItem = {
  key: AdminSystemHealthItemKey;
  label: string;
  value: string;
  detail: string;
  href?: string;
};

function docHref(repositoryUrl: string, path: string): string | undefined {
  const cleanUrl = repositoryUrl.replace(/\/$/, "");
  return cleanUrl ? `${cleanUrl}/blob/main/${path}` : undefined;
}

function formatMegabytes(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

function pluralizeType(count: number): string {
  return count === 1 ? "type" : "types";
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function formatRelativeAge(finishedAt: string | null, now: Date): string {
  if (!finishedAt) {
    return "unknown age";
  }

  const finished = new Date(finishedAt);
  const diffMs = Math.max(0, now.getTime() - finished.getTime());
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function backupRunValue(run: AdminBackupRun | null | undefined, now: Date): string {
  if (run === undefined) {
    return "Checking";
  }
  if (run === null) {
    return "No status";
  }
  if (run.status === "failed") {
    return "Last failed";
  }

  return formatRelativeAge(run.finished_at, now);
}

function backupRunDetail(run: AdminBackupRun | null | undefined, now: Date): string {
  if (run === undefined) {
    return "Looking for the latest recorded pnpm backup:supabase run.";
  }
  if (run === null) {
    return "Run pnpm backup:supabase after migrating backup_runs to record freshness for admins.";
  }
  if (run.status === "failed") {
    return `Latest recorded backup failed ${formatRelativeAge(run.finished_at, now)}. Rerun pnpm backup:supabase before production database work.`;
  }

  const tableCount = run.table_count ?? 0;
  const tableRows = run.table_rows ?? 0;
  const storageBucketCount = run.storage_bucket_count ?? 0;
  const storageObjectCount = run.storage_object_count ?? 0;
  const authDetail = run.auth_users_exported
    ? ` Auth metadata was exported${typeof run.auth_user_count === "number" ? ` for ${run.auth_user_count} ${pluralize(run.auth_user_count, "user")}` : ""}.`
    : " Auth metadata was not exported.";

  return `Completed with ${tableCount} ${pluralize(tableCount, "table")}, ${tableRows} ${pluralize(tableRows, "row")}, ${storageBucketCount} Storage ${pluralize(storageBucketCount, "bucket")}, and ${storageObjectCount} Storage ${pluralize(storageObjectCount, "object")}.${authDetail}`;
}

export function buildAdminSystemHealthItems(input: AdminSystemHealthInput): AdminSystemHealthItem[] {
  const acceptedTypes = input.acceptedImageMimeTypes.length;
  const now = input.now ?? new Date();

  return [
    {
      key: "config",
      label: "Config",
      value: "Manual CI",
      detail: "Run pnpm check:config before releases or deployment profile changes.",
      href: docHref(input.repositoryUrl, "docs/configuration.md"),
    },
    {
      key: "supabase",
      label: "Supabase contract",
      value: "Local checker",
      detail: "Run pnpm check:supabase-contract after schema, RPC, policy, or Storage changes.",
      href: docHref(input.repositoryUrl, "docs/supabase.md"),
    },
    {
      key: "storage",
      label: "Storage contract",
      value: `${formatMegabytes(input.maxUploadBytes)} MB, ${acceptedTypes} ${pluralizeType(acceptedTypes)}`,
      detail: "Frontend media limits and the committed Storage contract should stay aligned.",
      href: docHref(input.repositoryUrl, "docs/supabase.md"),
    },
    {
      key: "devBranch",
      label: "Development branch",
      value: "Task list",
      detail: "Use the Supabase branch checklist before pointing local app development at a production-derived branch.",
      href: docHref(input.repositoryUrl, "docs/supabase-branching.md"),
    },
    {
      key: "backups",
      label: "Backup freshness",
      value: backupRunValue(input.latestBackupRun, now),
      detail: backupRunDetail(input.latestBackupRun, now),
      href: docHref(input.repositoryUrl, "docs/maintenance.md"),
    },
    {
      key: "docs",
      label: "Docs",
      value: "In-app",
      detail: "Docs are published inside the static app; run the Pages workflow manually when app deployment needs remote verification.",
      href: docHref(input.repositoryUrl, "docs/index.md"),
    },
    {
      key: "telegram",
      label: "Telegram",
      value: input.telegramAdminNotifications ? "Configured" : "Disabled",
      detail: "Mute, dedupe, and seen-state are prepared roadmap items.",
      href: docHref(input.repositoryUrl, "docs/telegramBot.md"),
    },
  ];
}
