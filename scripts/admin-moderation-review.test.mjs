import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAcceptedSuggestionApplication,
  buildOwnerSuggestionApplication,
  buildAdminModerationReviewNote,
  moderationReviewRequiresNote,
} from "../src/lib/admin-moderation-review.ts";

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

test("builds accepted suggestion item updates with explicit admin notes", () => {
  assert.deepEqual(buildAcceptedSuggestionApplication({
    name: "  Long table  ",
    description: "  Seats eight. ",
    imageUrl: "  https://example.com/table.webp ",
    note: "  Applied updated title and description. ",
  }), {
    ok: true,
    name: "Long table",
    description: "Seats eight.",
    imageUrl: "https://example.com/table.webp",
    adminNote: "Applied updated title and description.",
  });

  assert.deepEqual(buildAcceptedSuggestionApplication({
    name: "",
    description: "Ignored",
    imageUrl: "",
    note: "Applied.",
  }), {
    ok: false,
    name: null,
    description: null,
    imageUrl: null,
    adminNote: null,
  });

  assert.deepEqual(buildAcceptedSuggestionApplication({
    name: "Long table",
    description: "",
    imageUrl: "",
    note: "ok",
  }), {
    ok: false,
    name: null,
    description: null,
    imageUrl: null,
    adminNote: null,
  });
});

test("builds owner suggestion applications with explicit admin notes", () => {
  assert.deepEqual(buildOwnerSuggestionApplication({
    ownerKind: " profile ",
    ownerProfileId: " 00000000-0000-4000-8000-000000000001 ",
    ownerLabel: " Ignored for profile ",
    note: " Assigned to the requesting profile. ",
  }), {
    ok: true,
    ownerKind: "profile",
    ownerProfileId: "00000000-0000-4000-8000-000000000001",
    ownerLabel: null,
    adminNote: "Assigned to the requesting profile.",
  });

  assert.deepEqual(buildOwnerSuggestionApplication({
    ownerKind: "free_text",
    ownerProfileId: "00000000-0000-4000-8000-000000000001",
    ownerLabel: "  Tool library shelf ",
    note: " Accepted free-text owner. ",
  }), {
    ok: true,
    ownerKind: "free_text",
    ownerProfileId: null,
    ownerLabel: "Tool library shelf",
    adminNote: "Accepted free-text owner.",
  });

  assert.deepEqual(buildOwnerSuggestionApplication({
    ownerKind: "operator",
    ownerProfileId: "00000000-0000-4000-8000-000000000001",
    ownerLabel: "  Main operator  ",
    note: " Marked as operator-owned. ",
  }), {
    ok: true,
    ownerKind: "operator",
    ownerProfileId: null,
    ownerLabel: "Main operator",
    adminNote: "Marked as operator-owned.",
  });

  assert.deepEqual(buildOwnerSuggestionApplication({
    ownerKind: "profile",
    ownerProfileId: "",
    ownerLabel: "",
    note: "Missing profile.",
  }), {
    ok: false,
    ownerKind: null,
    ownerProfileId: null,
    ownerLabel: null,
    adminNote: null,
  });

  assert.deepEqual(buildOwnerSuggestionApplication({
    ownerKind: "free_text",
    ownerProfileId: "",
    ownerLabel: "",
    note: "Missing label.",
  }), {
    ok: false,
    ownerKind: null,
    ownerProfileId: null,
    ownerLabel: null,
    adminNote: null,
  });
});
