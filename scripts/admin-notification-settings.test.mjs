import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminNotificationSettings } from "../src/lib/admin-notification-settings.ts";

test("builds read-only notification settings for enabled telegram deployments", () => {
  const settings = buildAdminNotificationSettings({ telegramAdminNotifications: true });

  assert.deepEqual(
    settings.sections.map((section) => [section.key, section.label, section.status]),
    [
      ["telegram", "Telegram", "Configured"],
      ["mute", "Mute windows", "Prepared"],
      ["dedupe", "Dedupe", "Prepared"],
      ["seen", "Admin seen-state", "Prepared"],
    ],
  );
  assert.deepEqual(settings.muteWindows, ["1 day", "1 week", "Forever"]);
});

test("reports disabled telegram deployments without changing planned controls", () => {
  const settings = buildAdminNotificationSettings({ telegramAdminNotifications: false });

  assert.equal(settings.sections[0].status, "Disabled");
  assert.deepEqual(settings.muteWindows, ["1 day", "1 week", "Forever"]);
});

test("summarizes notification event and mute state when the backend contract is available", () => {
  const settings = buildAdminNotificationSettings({
    telegramAdminNotifications: true,
    notificationEvents: [
      { status: "sent", seen_at: null },
      { status: "failed", seen_at: null },
      { status: "sent", seen_at: "2026-05-05T10:00:00Z" },
      { status: "skipped_muted", seen_at: null },
    ],
    notificationMutes: [
      { muted_forever: false, muted_until: "2026-05-06T10:00:00Z", revoked_at: null },
      { muted_forever: false, muted_until: "2026-05-04T10:00:00Z", revoked_at: null },
      { muted_forever: true, muted_until: null, revoked_at: null },
      { muted_forever: true, muted_until: null, revoked_at: "2026-05-05T10:00:00Z" },
    ],
    now: new Date("2026-05-05T10:00:00Z"),
  });

  assert.deepEqual(
    settings.sections.map((section) => [section.key, section.status, section.detail]),
    [
      ["telegram", "Configured", "Deployment-level notification switch."],
      ["mute", "Configured", "2 active mutes; muted events are recorded without Telegram delivery."],
      ["dedupe", "Configured", "2 unseen notifications are suppressing duplicates until admin review."],
      ["seen", "Configured", "1 notification has been marked seen by an admin."],
    ],
  );
});
