import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminItemVersionTimeline, summarizeAdminItemVersions } from "../src/lib/admin-item-versions.ts";

test("builds an admin item version timeline newest version first", () => {
  const timeline = buildAdminItemVersionTimeline([
    {
      id: "version-1",
      item_id: "item-1",
      version_number: 1,
      name: "Old name",
      description: "First description",
      image_url: null,
      owner_kind: "operator",
      owner_profile_id: null,
      owner_label: "Library",
      visibility_state: "visible",
      actor_id: "admin-1",
      reason: "created",
      created_at: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "version-3",
      item_id: "item-1",
      version_number: 3,
      name: "Current name",
      description: "Current description",
      image_url: "/current.webp",
      owner_kind: "profile",
      owner_profile_id: "profile-1",
      owner_label: null,
      visibility_state: "pending_visible",
      actor_id: "admin-2",
      reason: "restored from version 1",
      created_at: "2026-05-03T10:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    timeline.map((entry) => [entry.label, entry.ownerLabel, entry.visibilityLabel, entry.reasonLabel]),
    [
      ["Version 3", "Profile owner", "pending visible", "restored from version 1"],
      ["Version 1", "Library", "visible", "created"],
    ],
  );
});

test("summarizes version history without invalid dates breaking ordering", () => {
  const summary = summarizeAdminItemVersions([
    {
      id: "version-1",
      item_id: "item-1",
      version_number: 1,
      name: "First",
      description: null,
      image_url: null,
      owner_kind: "operator",
      owner_profile_id: null,
      owner_label: null,
      visibility_state: "visible",
      actor_id: null,
      reason: null,
      created_at: "not-a-date",
    },
    {
      id: "version-2",
      item_id: "item-1",
      version_number: 2,
      name: "Second",
      description: null,
      image_url: null,
      owner_kind: "free_text",
      owner_profile_id: null,
      owner_label: "Tool desk",
      visibility_state: "admin_hidden",
      actor_id: null,
      reason: "",
      created_at: "2026-05-02T10:00:00.000Z",
    },
  ]);

  assert.equal(summary.totalVersions, 2);
  assert.equal(summary.latestVersionNumber, 2);
  assert.equal(summary.latestCreatedAt, "2026-05-02T10:00:00.000Z");
});
