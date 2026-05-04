import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminModerationReviewNote, moderationReviewRequiresNote } from "../src/lib/admin-moderation-review.ts";

test("requires admin notes for terminal moderation decisions", () => {
  assert.equal(moderationReviewRequiresNote("reviewing"), false);
  assert.equal(moderationReviewRequiresNote("accepted"), true);
  assert.equal(moderationReviewRequiresNote("rejected"), true);
  assert.equal(moderationReviewRequiresNote("resolved"), true);
  assert.equal(moderationReviewRequiresNote("dismissed"), true);
});

test("normalizes review notes and rejects short terminal notes", () => {
  assert.deepEqual(buildAdminModerationReviewNote({ status: "reviewing", note: "" }), {
    ok: true,
    adminNote: null,
  });
  assert.deepEqual(buildAdminModerationReviewNote({ status: "accepted", note: "  Looks correct.  " }), {
    ok: true,
    adminNote: "Looks correct.",
  });
  assert.deepEqual(buildAdminModerationReviewNote({ status: "dismissed", note: "ok" }), {
    ok: false,
    adminNote: null,
  });
});
