export type DashboardView = "borrowed" | "available" | "all";

export type DashboardItemFilter =
  | { method: "eq"; column: "status" | "visibility_state" | "borrowed_by"; value: string }
  | { method: "ilike"; column: "name"; value: string };

export type DashboardItemFilterPlan = {
  empty: boolean;
  filters: DashboardItemFilter[];
};

export type DashboardInitialViewState = {
  hasBorrowedItems: boolean;
  view: DashboardView;
};

export function buildDashboardEmptyMessage({ query, view }: { query: string; view: DashboardView }): string {
  if (query.trim()) {
    return "No items match your search.";
  }

  if (view === "borrowed") {
    return "You haven't borrowed any items right now.";
  }

  if (view === "available") {
    return "No items are currently available.";
  }

  return "No items found.";
}

export function buildDashboardInitialViewState(borrowedItemCount: number | null | undefined): DashboardInitialViewState {
  const hasBorrowedItems = Boolean(borrowedItemCount && borrowedItemCount > 0);
  return {
    hasBorrowedItems,
    view: hasBorrowedItems ? "borrowed" : "available",
  };
}

export function buildDashboardItemFilters({
  userId,
  query,
  view,
}: {
  userId: string | null;
  query: string;
  view: DashboardView;
}): DashboardItemFilterPlan {
  const searchQuery = query.trim();

  if (searchQuery) {
    return {
      empty: false,
      filters: [
        { method: "ilike", column: "name", value: `%${searchQuery}%` },
        { method: "eq", column: "visibility_state", value: "visible" },
      ],
    };
  }

  if (view === "borrowed") {
    return userId
      ? { empty: false, filters: [{ method: "eq", column: "borrowed_by", value: userId }] }
      : { empty: true, filters: [] };
  }

  if (view === "available") {
    return {
      empty: false,
      filters: [
        { method: "eq", column: "status", value: "inStock" },
        { method: "eq", column: "visibility_state", value: "visible" },
      ],
    };
  }

  return {
    empty: false,
    filters: [{ method: "eq", column: "visibility_state", value: "visible" }],
  };
}
