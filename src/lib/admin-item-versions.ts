import type { ItemVersion } from "@/app/model/model";

export type AdminItemVersion = ItemVersion;

export type AdminItemVersionTimelineEntry = AdminItemVersion & {
  label: string;
  ownerLabel: string;
  visibilityLabel: string;
  reasonLabel: string;
};

export type AdminItemVersionSummary = {
  totalVersions: number;
  latestVersionNumber: number | null;
  latestCreatedAt: string | null;
};

function dateTime(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function newestVersionFirst(left: AdminItemVersion, right: AdminItemVersion): number {
  if (right.version_number !== left.version_number) {
    return right.version_number - left.version_number;
  }

  const rightTime = dateTime(right.created_at);
  const leftTime = dateTime(left.created_at);

  if (Number.isFinite(rightTime) && Number.isFinite(leftTime)) {
    return rightTime - leftTime;
  }

  if (Number.isFinite(rightTime)) return 1;
  if (Number.isFinite(leftTime)) return -1;
  return 0;
}

function ownerLabel(version: AdminItemVersion): string {
  if (version.owner_kind === "profile") return "Profile owner";
  if (version.owner_kind === "free_text") return version.owner_label || "Free-text owner";
  return version.owner_label || "Operator";
}

function visibilityLabel(version: AdminItemVersion): string {
  return version.visibility_state.replaceAll("_", " ");
}

function reasonLabel(version: AdminItemVersion): string {
  return version.reason?.trim() || "No reason recorded";
}

export function buildAdminItemVersionTimeline(
  versions: AdminItemVersion[],
): AdminItemVersionTimelineEntry[] {
  return [...versions].sort(newestVersionFirst).map((version) => ({
    ...version,
    label: `Version ${version.version_number}`,
    ownerLabel: ownerLabel(version),
    visibilityLabel: visibilityLabel(version),
    reasonLabel: reasonLabel(version),
  }));
}

export function summarizeAdminItemVersions(versions: AdminItemVersion[]): AdminItemVersionSummary {
  const timeline = buildAdminItemVersionTimeline(versions);
  const latest = timeline[0] ?? null;

  return {
    totalVersions: versions.length,
    latestVersionNumber: latest?.version_number ?? null,
    latestCreatedAt: Number.isFinite(dateTime(latest?.created_at)) ? latest?.created_at ?? null : null,
  };
}
