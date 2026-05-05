import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeletionRequestReview,
  buildDeletionRequestExecution,
  canExecuteDeletionRequestStatus,
  canReviewDeletionRequestStatus,
  summarizeDeletionRequests,
} from "../src/lib/admin-deletion-requests.ts";

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

test("builds non-destructive deletion request review notes", () => {
  assert.deepEqual(buildDeletionRequestReview({ status: "reviewing", note: "" }), {
    ok: true,
    adminNote: null,
  });
  assert.deepEqual(buildDeletionRequestReview({ status: "cancelled", note: "  User withdrew request. " }), {
    ok: true,
    adminNote: "User withdrew request.",
  });
  assert.deepEqual(buildDeletionRequestReview({ status: "cancelled", note: "" }), {
    ok: false,
    adminNote: null,
  });
});

test("allows review actions only for active deletion request states", () => {
  assert.equal(canReviewDeletionRequestStatus("pending"), true);
  assert.equal(canReviewDeletionRequestStatus("reviewing"), true);
  assert.equal(canReviewDeletionRequestStatus("completed"), false);
  assert.equal(canReviewDeletionRequestStatus("cancelled"), false);
});

test("builds approved deletion execution notes only for reviewing requests", () => {
  assert.deepEqual(buildDeletionRequestExecution({ status: "reviewing", note: "  Verified export and retention policy. " }), {
    ok: true,
    adminNote: "Verified export and retention policy.",
  });
  assert.deepEqual(buildDeletionRequestExecution({ status: "pending", note: "Verified export and retention policy." }), {
    ok: false,
    adminNote: null,
  });
  assert.deepEqual(buildDeletionRequestExecution({ status: "reviewing", note: "short" }), {
    ok: false,
    adminNote: null,
  });
});

test("allows execution only after a request is in review", () => {
  assert.equal(canExecuteDeletionRequestStatus("pending"), false);
  assert.equal(canExecuteDeletionRequestStatus("reviewing"), true);
  assert.equal(canExecuteDeletionRequestStatus("completed"), false);
  assert.equal(canExecuteDeletionRequestStatus("cancelled"), false);
});
