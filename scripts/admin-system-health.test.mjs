import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminSystemHealthItems } from "../src/lib/admin-system-health.ts";

test("builds compact admin health items from public config", () => {
  const items = buildAdminSystemHealthItems({
    repositoryUrl: "https://github.com/example/app",
    telegramAdminNotifications: true,
    maxUploadBytes: 10_485_760,
    acceptedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    latestBackupRun: undefined,
    now: new Date("2026-05-05T12:00:00Z"),
  });

  assert.deepEqual(
    items.map((item) => [item.key, item.label, item.value]),
    [
      ["config", "Config", "Manual CI"],
      ["supabase", "Supabase contract", "Local checker"],
      ["storage", "Storage contract", "10 MB, 3 types"],
      ["devBranch", "Development branch", "Task list"],
      ["backups", "Backup freshness", "Checking"],
      ["docs", "Docs", "Manual workflow"],
      ["telegram", "Telegram", "Configured"],
    ],
  );
  assert.equal(items[0].href, "https://github.com/example/app/blob/main/docs/configuration.md");
  assert.equal(items[3].href, "https://github.com/example/app/blob/main/docs/supabase-branching.md");
  assert.equal(items[4].detail, "Looking for the latest recorded pnpm backup:supabase run.");
  assert.equal(items[6].detail, "Mute, dedupe, and seen-state are prepared roadmap items.");
});

test("reports disabled telegram notifications without requiring a repository url", () => {
  const items = buildAdminSystemHealthItems({
    repositoryUrl: "",
    telegramAdminNotifications: false,
    maxUploadBytes: 5_000_000,
    acceptedImageMimeTypes: ["image/jpeg"],
    latestBackupRun: null,
    now: new Date("2026-05-05T12:00:00Z"),
  });

  const telegram = items.find((item) => item.key === "telegram");
  const storage = items.find((item) => item.key === "storage");

  assert.equal(telegram?.value, "Disabled");
  assert.equal(items.find((item) => item.key === "backups")?.value, "No status");
  assert.equal(storage?.value, "5 MB, 1 type");
  assert.equal(items.some((item) => item.href), false);
});

test("summarizes the latest completed backup run", () => {
  const items = buildAdminSystemHealthItems({
    repositoryUrl: "https://github.com/example/app/",
    telegramAdminNotifications: false,
    maxUploadBytes: 10_485_760,
    acceptedImageMimeTypes: ["image/jpeg", "image/png"],
    latestBackupRun: {
      status: "completed",
      finished_at: "2026-05-05T09:30:00Z",
      table_count: 10,
      table_rows: 42,
      storage_bucket_count: 1,
      storage_object_count: 7,
      storage_bytes: 12_345,
      auth_users_exported: false,
      auth_user_count: null,
    },
    now: new Date("2026-05-05T12:00:00Z"),
  });

  const backup = items.find((item) => item.key === "backups");

  assert.equal(backup?.value, "2h ago");
  assert.equal(
    backup?.detail,
    "Completed with 10 tables, 42 rows, 1 Storage bucket, and 7 Storage objects. Auth metadata was not exported.",
  );
});

test("surfaces failed backup runs without implying recoverability", () => {
  const items = buildAdminSystemHealthItems({
    repositoryUrl: "",
    telegramAdminNotifications: false,
    maxUploadBytes: 10_485_760,
    acceptedImageMimeTypes: ["image/jpeg"],
    latestBackupRun: {
      status: "failed",
      finished_at: "2026-05-03T12:00:00Z",
      table_count: 2,
      table_rows: 5,
      storage_bucket_count: 1,
      storage_object_count: 0,
      storage_bytes: 0,
      auth_users_exported: true,
      auth_user_count: 3,
    },
    now: new Date("2026-05-05T12:00:00Z"),
  });

  const backup = items.find((item) => item.key === "backups");

  assert.equal(backup?.value, "Last failed");
  assert.equal(
    backup?.detail,
    "Latest recorded backup failed 2d ago. Rerun pnpm backup:supabase before production database work.",
  );
});
