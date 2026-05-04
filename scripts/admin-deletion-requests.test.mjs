import assert from "node:assert/strict";
import test from "node:test";

import { summarizeDeletionRequests } from "../src/lib/admin-deletion-requests.ts";

function request(overrides) {
  return {
    id: "request",
    user_id: "profile",
    status: "pending",
    requested_at: "2026-05-01T10:00:00.000Z",
    reviewed_at: null,
    completed_at: null,
    ...overrides,
  };
}

test("counts deletion requests by operational status", () => {
  const summary = summarizeDeletionRequests([
    request({ id: "pending-a", status: "pending" }),
    request({ id: "pending-b", status: "pending" }),
    request({ id: "reviewing", status: "reviewing" }),
    request({ id: "completed", status: "completed" }),
    request({ id: "cancelled", status: "cancelled" }),
  ]);

  assert.deepEqual(summary.counts, {
    pending: 2,
    reviewing: 1,
    completed: 1,
    cancelled: 1,
  });
  assert.equal(summary.openCount, 3);
});

test("sorts open requests before closed requests and newest first within status", () => {
  const summary = summarizeDeletionRequests([
    request({ id: "completed-new", status: "completed", requested_at: "2026-05-05T10:00:00.000Z" }),
    request({ id: "pending-old", status: "pending", requested_at: "2026-05-01T10:00:00.000Z" }),
    request({ id: "reviewing", status: "reviewing", requested_at: "2026-05-04T10:00:00.000Z" }),
    request({ id: "pending-new", status: "pending", requested_at: "2026-05-03T10:00:00.000Z" }),
  ]);

  assert.deepEqual(summary.sorted.map((row) => row.id), [
    "pending-new",
    "pending-old",
    "reviewing",
    "completed-new",
  ]);
});
