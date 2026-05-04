import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminRecentActivity } from "../src/lib/admin-recent-activity.ts";

test("builds recent borrow, return, and upload activity newest first", () => {
  const activity = buildAdminRecentActivity({
    items: [
      { id: "camera", name: "Camera", image_url: "/camera.webp", created_at: "2026-05-01T10:00:00.000Z" },
      { id: "drill", name: "Drill", image_url: null, created_at: "2026-05-03T10:00:00.000Z" },
      { id: "lamp", name: "Lamp", image_url: "/lamp.webp", created_at: "2026-05-04T10:00:00.000Z" },
    ],
    borrowHistory: [
      {
        item_id: "camera",
        borrowed_at: "2026-05-02T10:00:00.000Z",
        returned_at: "2026-05-05T10:00:00.000Z",
      },
      {
        item_id: "drill",
        borrowed_at: "2026-05-04T12:00:00.000Z",
        returned_at: null,
      },
    ],
    limit: 3,
  });

  assert.deepEqual(
    activity.borrowReturns.map((event) => [event.kind, event.itemName, event.occurredAt]),
    [
      ["returned", "Camera", "2026-05-05T10:00:00.000Z"],
      ["borrowed", "Drill", "2026-05-04T12:00:00.000Z"],
      ["borrowed", "Camera", "2026-05-02T10:00:00.000Z"],
    ],
  );
  assert.deepEqual(
    activity.uploads.map((event) => [event.itemName, event.occurredAt]),
    [
      ["Lamp", "2026-05-04T10:00:00.000Z"],
      ["Camera", "2026-05-01T10:00:00.000Z"],
    ],
  );
});

test("falls back to item ids and ignores invalid dates", () => {
  const activity = buildAdminRecentActivity({
    items: [],
    borrowHistory: [{ item_id: "missing", borrowed_at: "not-a-date", returned_at: "2026-05-04T10:00:00.000Z" }],
  });

  assert.deepEqual(activity.borrowReturns.map((event) => [event.kind, event.itemName]), [["returned", "Unknown item"]]);
  assert.deepEqual(activity.uploads, []);
});
