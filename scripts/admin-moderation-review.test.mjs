import assert from "node:assert/strict";
import test from "node:test";

import { buildItemChangeApplication } from "../src/lib/admin-moderation-review.ts";

test("builds accepted item change applications for operator-owned items", () => {
  assert.deepEqual(buildItemChangeApplication({
    name: "  Long table  ",
    description: "  Seats eight. ",
    imageUrl: "  https://example.com/table.webp ",
    ownerKind: " operator ",
    ownerProfileId: "00000000-0000-4000-8000-000000000001",
    ownerLabel: "  Main operator  ",
    visibilityState: " visible ",
  }), {
    ok: true,
    name: "Long table",
    description: "Seats eight.",
    imageUrl: "https://example.com/table.webp",
    ownerKind: "operator",
    ownerProfileId: null,
    ownerLabel: null,
    visibilityState: "visible",
  });
});

test("builds item change applications for profile and free-text owners", () => {
  assert.deepEqual(buildItemChangeApplication({
    name: "Projector",
    description: "",
    imageUrl: "",
    ownerKind: "profile",
    ownerProfileId: " 00000000-0000-4000-8000-000000000001 ",
    ownerLabel: "Ignored for profile",
    visibilityState: "admin_hidden",
  }), {
    ok: true,
    name: "Projector",
    description: null,
    imageUrl: null,
    ownerKind: "profile",
    ownerProfileId: "00000000-0000-4000-8000-000000000001",
    ownerLabel: null,
    visibilityState: "admin_hidden",
  });

  assert.deepEqual(buildItemChangeApplication({
    name: "Cable box",
    description: "",
    imageUrl: "",
    ownerKind: "free_text",
    ownerProfileId: "00000000-0000-4000-8000-000000000001",
    ownerLabel: "  Tool library shelf ",
    visibilityState: "pending_visible",
  }), {
    ok: true,
    name: "Cable box",
    description: null,
    imageUrl: null,
    ownerKind: "free_text",
    ownerProfileId: null,
    ownerLabel: "Tool library shelf",
    visibilityState: "pending_visible",
  });
});

test("rejects incomplete or invalid item change applications", () => {
  const invalidCases = [
    {
      name: "",
      description: "Ignored",
      imageUrl: "",
      ownerKind: "operator",
      ownerProfileId: "",
      ownerLabel: "",
      visibilityState: "visible",
    },
    {
      name: "Long table",
      description: "",
      imageUrl: "",
      ownerKind: "profile",
      ownerProfileId: "",
      ownerLabel: "",
      visibilityState: "visible",
    },
    {
      name: "Long table",
      description: "",
      imageUrl: "",
      ownerKind: "free_text",
      ownerProfileId: "",
      ownerLabel: "",
      visibilityState: "visible",
    },
    {
      name: "Long table",
      description: "",
      imageUrl: "",
      ownerKind: "unknown",
      ownerProfileId: "",
      ownerLabel: "",
      visibilityState: "visible",
    },
    {
      name: "Long table",
      description: "",
      imageUrl: "",
      ownerKind: "operator",
      ownerProfileId: "",
      ownerLabel: "",
      visibilityState: "unknown",
    },
  ];

  for (const input of invalidCases) {
    assert.deepEqual(buildItemChangeApplication(input), {
      ok: false,
      name: null,
      description: null,
      imageUrl: null,
      ownerKind: null,
      ownerProfileId: null,
      ownerLabel: null,
      visibilityState: null,
    });
  }
});
