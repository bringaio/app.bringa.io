type AdminRecentItem = {
  id: string;
  name: string;
  image_url?: string | null;
  created_at?: string | null;
};

type AdminRecentBorrowHistory = {
  item_id: string;
  borrowed_at?: string | null;
  returned_at?: string | null;
};

export type AdminRecentBorrowReturnEvent = {
  kind: "borrowed" | "returned";
  itemId: string;
  itemName: string;
  occurredAt: string;
};

export type AdminRecentUploadEvent = {
  itemId: string;
  itemName: string;
  occurredAt: string;
};

export type AdminRecentActivity = {
  borrowReturns: AdminRecentBorrowReturnEvent[];
  uploads: AdminRecentUploadEvent[];
};

export type AdminRecentActivityInput = {
  items: AdminRecentItem[];
  borrowHistory: AdminRecentBorrowHistory[];
  limit?: number;
};

function dateTime(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function isValidDate(value: string | null | undefined): value is string {
  return Number.isFinite(dateTime(value));
}

function newestFirst<TEvent extends { occurredAt: string }>(events: TEvent[]): TEvent[] {
  return [...events].sort((left, right) => dateTime(right.occurredAt) - dateTime(left.occurredAt));
}

export function buildAdminRecentActivity(input: AdminRecentActivityInput): AdminRecentActivity {
  const limit = input.limit ?? 5;
  const itemNames = new Map(input.items.map((item) => [item.id, item.name || "Unnamed item"]));
  const itemName = (itemId: string) => itemNames.get(itemId) || "Unknown item";

  const borrowReturns = input.borrowHistory.flatMap((entry): AdminRecentBorrowReturnEvent[] => {
    const events: AdminRecentBorrowReturnEvent[] = [];

    if (isValidDate(entry.borrowed_at)) {
      events.push({
        kind: "borrowed",
        itemId: entry.item_id,
        itemName: itemName(entry.item_id),
        occurredAt: entry.borrowed_at,
      });
    }

    if (isValidDate(entry.returned_at)) {
      events.push({
        kind: "returned",
        itemId: entry.item_id,
        itemName: itemName(entry.item_id),
        occurredAt: entry.returned_at,
      });
    }

    return events;
  });

  const uploads = input.items
    .filter((item) => Boolean(item.image_url) && isValidDate(item.created_at))
    .map((item) => ({
      itemId: item.id,
      itemName: item.name || "Unnamed item",
      occurredAt: item.created_at as string,
    }));

  return {
    borrowReturns: newestFirst(borrowReturns).slice(0, limit),
    uploads: newestFirst(uploads).slice(0, limit),
  };
}
