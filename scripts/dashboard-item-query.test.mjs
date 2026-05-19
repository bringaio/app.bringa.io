import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardEmptyMessage,
  buildDashboardInitialViewState,
  buildDashboardItemFilters,
} from "../src/lib/dashboard-item-query.ts";

test("defaults to borrowed view only when the user has current borrowed items", () => {
  assert.deepEqual(buildDashboardInitialViewState(2), {
    hasBorrowedItems: true,
    view: "borrowed",
  });

  assert.deepEqual(buildDashboardInitialViewState(0), {
    hasBorrowedItems: false,
    view: "available",
  });

  assert.deepEqual(buildDashboardInitialViewState(null), {
    hasBorrowedItems: false,
    view: "available",
  });
});

test("builds empty dashboard messages from search and view state", () => {
  assert.equal(buildDashboardEmptyMessage({ query: " drill ", view: "available" }), "No items match your search.");
  assert.equal(buildDashboardEmptyMessage({ query: "", view: "borrowed" }), "You haven't borrowed any items right now.");
  assert.equal(buildDashboardEmptyMessage({ query: "", view: "available" }), "No items are currently available.");
  assert.equal(buildDashboardEmptyMessage({ query: "", view: "all" }), "No items found.");
});

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
