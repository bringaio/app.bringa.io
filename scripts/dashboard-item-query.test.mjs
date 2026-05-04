import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardItemFilters } from "../src/lib/dashboard-item-query.ts";

test("shows visible available items by default", () => {
  assert.deepEqual(buildDashboardItemFilters({ userId: "user-1", query: "", view: "available" }), {
    empty: false,
    filters: [
      { method: "eq", column: "status", value: "inStock" },
      { method: "eq", column: "visibility_state", value: "visible" },
    ],
  });
});

test("keeps borrowed view scoped to the current user", () => {
  assert.deepEqual(buildDashboardItemFilters({ userId: "user-1", query: "", view: "borrowed" }), {
    empty: false,
    filters: [{ method: "eq", column: "borrowed_by", value: "user-1" }],
  });

  assert.deepEqual(buildDashboardItemFilters({ userId: null, query: "", view: "borrowed" }), {
    empty: true,
    filters: [],
  });
});

test("search trims input and keeps hidden items out of public results", () => {
  assert.deepEqual(buildDashboardItemFilters({ userId: "user-1", query: "  drill  ", view: "all" }), {
    empty: false,
    filters: [
      { method: "ilike", column: "name", value: "%drill%" },
      { method: "eq", column: "visibility_state", value: "visible" },
    ],
  });
});
