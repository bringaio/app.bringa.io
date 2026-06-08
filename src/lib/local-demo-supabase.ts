type DemoRow = Record<string, unknown>;

type QueryResult<T> = {
  data: T;
  error: Error | null;
  count?: number | null;
};

type Filter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "neq"; column: string; value: unknown }
  | { type: "ilike"; column: string; value: string }
  | { type: "in"; column: string; values: unknown[] }
  | { type: "is"; column: string; value: unknown }
  | { type: "or"; conditions: Array<{ column: string; value: string }> };

type Order = {
  column: string;
  ascending: boolean;
};

type DemoTables = Record<string, DemoRow[]>;

export const localDemoUser = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "local.demo@app.bringa.io",
  app_metadata: {},
  user_metadata: {
    full_name: "Local Demo",
  },
  created_at: "2026-05-05T08:00:00.000Z",
};

const now = "2026-05-05T08:00:00.000Z";
const secondDemoUserId = "00000000-0000-4000-8000-000000000002";

function cloneRow<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function demoId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function demoStoragePlaceholderUrl(bucket: string, path: string) {
  const label = `${bucket}/${path}`
    .slice(0, 80)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f3f4f6"/><text x="400" y="300" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="28" fill="#6b7280">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function demoStoragePublicUrl(bucket: string, path: string, body?: unknown) {
  if (
    typeof Blob !== "undefined"
    && body instanceof Blob
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function"
  ) {
    return URL.createObjectURL(body);
  }

  return demoStoragePlaceholderUrl(bucket, path);
}

function createDemoTables(): DemoTables {
  return {
    profiles: [
      {
        id: localDemoUser.id,
        email: localDemoUser.email,
        display_name: "Local",
        display_surname: "Demo",
        avatar_url: null,
        description: "Local development profile. This row never leaves the browser.",
        profile_valid: true,
        invited_by_code: "LOCAL-DEMO",
        created_at: now,
        updated_at: now,
      },
      {
        id: secondDemoUserId,
        email: "sam.borrower@example.test",
        display_name: "Sam",
        display_surname: "Borrower",
        avatar_url: null,
        description: "Additional local demo profile.",
        profile_valid: true,
        invited_by_code: "LOCAL-DEMO",
        created_at: now,
        updated_at: now,
      },
    ],
    admins: [
      {
        id: "demo-admin",
        profile_id: localDemoUser.id,
        invite_code: "LOCAL-DEMO",
        created_at: now,
      },
    ],
    items: [
      {
        id: "demo-desk-lamp",
        created_at: "2026-05-05T08:01:00.000Z",
        borrowed_by: null,
        name: "Desk Lamp",
        description: "Warm adjustable lamp for checking browsing, search, details, and borrowing.",
        status: "inStock",
        image_url: null,
        thumbnail_url: null,
        created_by: localDemoUser.id,
        owner_kind: "profile",
        owner_profile_id: localDemoUser.id,
        owner_label: "Local Demo",
        visibility_state: "visible",
        visibility_reason: null,
        hidden_at: null,
        hidden_by: null,
        deleted_at: null,
        deleted_by: null,
        handoff_policy: "return_to_owner",
      },
      {
        id: "demo-projector",
        created_at: "2026-05-05T08:02:00.000Z",
        borrowed_by: localDemoUser.id,
        name: "Portable Projector",
        description: "Borrowed sample item so the borrowed-first dashboard path can be inspected.",
        status: "borrowed",
        image_url: null,
        thumbnail_url: null,
        created_by: secondDemoUserId,
        owner_kind: "profile",
        owner_profile_id: secondDemoUserId,
        owner_label: "Sam Borrower",
        visibility_state: "visible",
        visibility_reason: null,
        hidden_at: null,
        hidden_by: null,
        deleted_at: null,
        deleted_by: null,
        handoff_policy: "direct_handoff_allowed",
      },
      {
        id: "demo-long-label",
        created_at: "2026-05-05T08:03:00.000Z",
        borrowed_by: null,
        name: "Extra Long Item Name For Responsive Layout Verification",
        description:
          "A deliberately long local demo description for checking card wrapping, detail pages, and narrow viewport behavior.",
        status: "inStock",
        image_url: null,
        thumbnail_url: null,
        created_by: localDemoUser.id,
        owner_kind: "profile",
        owner_profile_id: localDemoUser.id,
        owner_label: "Local Demo",
        visibility_state: "visible",
        visibility_reason: null,
        hidden_at: null,
        hidden_by: null,
        deleted_at: null,
        deleted_by: null,
        handoff_policy: "return_to_owner",
      },
    ],
    borrow_history: [
      {
        id: "demo-history-projector",
        item_id: "demo-projector",
        borrower_id: localDemoUser.id,
        borrowed_at: "2026-05-05T08:10:00.000Z",
        returned_at: null,
        notes: "Local demo borrow record.",
        created_at: "2026-05-05T08:10:00.000Z",
        borrower: {
          id: localDemoUser.id,
          email: localDemoUser.email,
          display_name: "Local",
          display_surname: "Demo",
        },
      },
    ],
    item_versions: [],
    item_images: [],
    item_suggestions: [],
    item_flags: [],
    account_deletion_requests: [],
    notification_events: [],
    notification_mutes: [],
    backup_runs: [],
  };
}

function normalizeValue(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function rowMatchesFilter(row: DemoRow, filter: Filter) {
  if (filter.type === "eq") {
    return row[filter.column] === filter.value;
  }

  if (filter.type === "neq") {
    return row[filter.column] !== filter.value;
  }

  if (filter.type === "ilike") {
    const pattern = filter.value.toLowerCase().replaceAll("%", "");
    return String(row[filter.column] ?? "").toLowerCase().includes(pattern);
  }

  if (filter.type === "in") {
    return filter.values.includes(row[filter.column]);
  }

  if (filter.type === "is") {
    return row[filter.column] === filter.value;
  }

  return filter.conditions.some((condition) => normalizeValue(row[condition.column]) === condition.value);
}

function projectRow(row: DemoRow, columns: string | undefined) {
  const normalized = columns?.trim();
  if (!normalized || normalized === "*" || normalized.includes("\n") || normalized.includes(":") || normalized.includes("(")) {
    return cloneRow(row);
  }

  const projected: DemoRow = {};
  for (const column of normalized.split(",").map((value) => value.trim()).filter(Boolean)) {
    projected[column] = row[column];
  }
  return projected;
}

function parseOrConditions(expression: string) {
  return expression
    .split(",")
    .map((condition) => condition.trim().match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ column: match[1], value: match[2] }));
}

type SelectEmbed = {
  alias: string;
  table: string;
  constraint: string | null;
  columns: string;
};

// Split a PostgREST select into top-level parts, keeping embedded resources
// (which contain parentheses) intact: "a,b,rel:tbl!fk(x,y)" -> ["a","b","rel:tbl!fk(x,y)"].
function splitSelectParts(select: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of select) {
    if (char === "(") {
      depth += 1;
      current += char;
    } else if (char === ")") {
      depth -= 1;
      current += char;
    } else if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Separate scalar columns from embedded foreign-table resources so the demo
// client can emulate Supabase's `relation:table!fkey(cols)` join expansion.
function parseSelect(select: string | undefined): { columns: string; embeds: SelectEmbed[] } {
  const normalized = select?.trim();
  if (!normalized || normalized === "*") {
    return { columns: "*", embeds: [] };
  }

  const columnParts: string[] = [];
  const embeds: SelectEmbed[] = [];
  for (const part of splitSelectParts(normalized)) {
    const embedMatch = part.match(/^(?:([a-zA-Z0-9_]+):)?([a-zA-Z0-9_]+)(?:!([a-zA-Z0-9_]+))?\(([\s\S]*)\)$/);
    if (embedMatch) {
      const table = embedMatch[2];
      embeds.push({
        alias: embedMatch[1] || table,
        table,
        constraint: embedMatch[3] || null,
        columns: embedMatch[4].trim() || "*",
      });
    } else {
      columnParts.push(part);
    }
  }

  return { columns: columnParts.length > 0 ? columnParts.join(",") : "*", embeds };
}

// Derive the local foreign-key column from a constraint hint like
// "item_suggestions_item_id_fkey" on table "item_suggestions" -> "item_id".
function embedLocalColumn(embed: SelectEmbed, tableName: string): string {
  if (embed.constraint) {
    let column = embed.constraint;
    if (column.endsWith("_fkey")) column = column.slice(0, -"_fkey".length);
    const prefix = `${tableName}_`;
    if (column.startsWith(prefix)) column = column.slice(prefix.length);
    return column;
  }
  return `${embed.alias}_id`;
}

// Demo mutations live only in memory, so without this they reset on every page
// refresh. Persist the fixture tables to sessionStorage so demo edits (hiding an
// item, borrowing, suggestions, ...) survive a reload within the browser session.
const DEMO_STORAGE_KEY = "bringa-local-demo-tables-v1";

function hasSessionStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function loadDemoTables(): DemoTables {
  const fresh = createDemoTables();
  if (!hasSessionStorage()) return fresh;
  try {
    const raw = window.sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<DemoTables>;
    // Start from a fresh fixture set so any newly added table is never missing.
    return { ...fresh, ...parsed } as DemoTables;
  } catch {
    return fresh;
  }
}

function saveDemoTables(tables: DemoTables): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // Best-effort: ignore quota or serialization errors.
  }
}

class LocalDemoQueryBuilder {
  private readonly tables: DemoTables;
  private readonly tableName: string;
  private readonly persist: () => void;
  private columns: string | undefined;
  private countMode: "exact" | null = null;
  private head = false;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private singleMode: "single" | "maybeSingle" | null = null;
  private updateValues: DemoRow | null = null;

  constructor(tables: DemoTables, tableName: string, persist: () => void = () => {}) {
    this.tables = tables;
    this.tableName = tableName;
    this.persist = persist;
  }

  select(columns = "*", options: { count?: "exact"; head?: boolean } = {}) {
    this.columns = columns;
    this.countMode = options.count ?? null;
    this.head = options.head ?? false;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ type: "neq", column, value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ type: "ilike", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: "in", column, values });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ type: "is", column, value });
    return this;
  }

  or(expression: string) {
    this.filters.push({ type: "or", conditions: parseOrConditions(expression) });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  update(values: DemoRow) {
    this.updateValues = values;
    return this;
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  // Expand a single embedded foreign-table resource by matching the local FK
  // column against the related table's primary key (id). Returns the projected
  // related row, or null when no match exists (mirrors Supabase's behavior).
  private resolveEmbed(row: DemoRow, embed: SelectEmbed): DemoRow | null {
    const localColumn = embedLocalColumn(embed, this.tableName);
    const localValue = row[localColumn];
    if (localValue === null || localValue === undefined) return null;
    const foreignTable = this.tables[embed.table] ?? [];
    const related = foreignTable.find((candidate) => candidate.id === localValue);
    return related ? projectRow(related, embed.columns) : null;
  }

  private async execute(): Promise<QueryResult<unknown>> {
    const table = this.tables[this.tableName] ?? [];
    let rows = table.filter((row) => this.filters.every((filter) => rowMatchesFilter(row, filter)));

    if (this.updateValues) {
      for (const row of rows) {
        Object.assign(row, this.updateValues, { updated_at: now });
      }
      this.persist();
      return { data: null, error: null, count: rows.length };
    }

    for (const order of this.orders) {
      rows = [...rows].sort((left, right) => {
        const leftValue = left[order.column];
        const rightValue = right[order.column];
        if (leftValue === rightValue) return 0;
        if (leftValue === null || leftValue === undefined) return 1;
        if (rightValue === null || rightValue === undefined) return -1;
        const comparison = String(leftValue).localeCompare(String(rightValue));
        return order.ascending ? comparison : -comparison;
      });
    }

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      // PostgREST .range(from, to) is inclusive on both ends.
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    const count = this.countMode === "exact" ? rows.length : null;
    if (this.head) {
      return { data: null, error: null, count };
    }

    const { columns, embeds } = parseSelect(this.columns);
    const projectedRows = rows.map((row) => {
      const projected = projectRow(row, columns);
      for (const embed of embeds) {
        projected[embed.alias] = this.resolveEmbed(row, embed);
      }
      return projected;
    });

    if (this.singleMode) {
      if (projectedRows.length === 0 && this.singleMode === "maybeSingle") {
        return { data: null, error: null, count };
      }
      if (projectedRows.length !== 1) {
        return { data: null, error: new Error(`Expected one ${this.tableName} row, found ${projectedRows.length}.`), count };
      }
      return { data: projectedRows[0], error: null, count };
    }

    return { data: projectedRows, error: null, count };
  }
}

function itemById(tables: DemoTables, itemId: unknown) {
  return tables.items.find((item) => item.id === itemId);
}

function pushVersion(tables: DemoTables, item: DemoRow, reason: string | null) {
  tables.item_versions.push({
    id: demoId("demo-version"),
    item_id: item.id,
    version_number: tables.item_versions.filter((version) => version.item_id === item.id).length + 1,
    name: item.name,
    description: item.description,
    image_url: item.image_url,
    thumbnail_url: item.thumbnail_url,
    owner_kind: item.owner_kind ?? "profile",
    owner_profile_id: item.owner_profile_id ?? null,
    owner_label: item.owner_label ?? null,
    visibility_state: item.visibility_state ?? "visible",
    actor_id: localDemoUser.id,
    reason,
    created_at: now,
  });
}

function buildRpcHandler(tables: DemoTables) {
  return async (name: string, params: DemoRow = {}): Promise<QueryResult<unknown>> => {
    if (name === "is_admin") {
      return { data: true, error: null };
    }

    if (name === "create_item") {
      const id = demoId("demo-item");
      tables.items.push({
        id,
        created_at: now,
        borrowed_by: null,
        name: params.name_input,
        description: params.description_input ?? null,
        status: "inStock",
        image_url: params.image_url_input ?? null,
        thumbnail_url: params.thumbnail_url_input ?? params.image_url_input ?? null,
        created_by: localDemoUser.id,
        owner_kind: "profile",
        owner_profile_id: localDemoUser.id,
        owner_label: "Local Demo",
        visibility_state: "visible",
        visibility_reason: null,
        hidden_at: null,
        hidden_by: null,
        deleted_at: null,
        deleted_by: null,
        handoff_policy: "return_to_owner",
      });
      if (params.image_storage_path_input) {
        tables.item_images.push({
          id: demoId("demo-image"),
          item_id: id,
          storage_bucket: params.image_storage_bucket_input ?? "items",
          storage_path: params.image_storage_path_input,
          public_url: params.image_url_input ?? null,
          thumbnail_storage_path: params.thumbnail_storage_path_input ?? null,
          thumbnail_public_url: params.thumbnail_url_input ?? params.image_url_input ?? null,
          uploaded_by: localDemoUser.id,
          caption: null,
          alt_text: params.name_input,
          sort_order: 0,
          is_cover: true,
          moderation_state: "accepted",
          deleted_at: null,
          created_at: now,
        });
      }
      return { data: id, error: null };
    }

    if (name === "update_item") {
      const item = itemById(tables, params.item_id_input);
      if (!item) return { data: false, error: null };
      pushVersion(tables, item, "Local demo edit");
      Object.assign(item, {
        name: params.name_input,
        description: params.description_input ?? null,
        image_url: params.image_url_input ?? null,
        thumbnail_url: params.thumbnail_url_input ?? params.image_url_input ?? null,
      });
      if (params.image_storage_path_input) {
        for (const image of tables.item_images) {
          if (image.item_id === item.id) image.is_cover = false;
        }
        tables.item_images.push({
          id: demoId("demo-image"),
          item_id: item.id,
          storage_bucket: params.image_storage_bucket_input ?? "items",
          storage_path: params.image_storage_path_input,
          public_url: params.image_url_input ?? null,
          thumbnail_storage_path: params.thumbnail_storage_path_input ?? null,
          thumbnail_public_url: params.thumbnail_url_input ?? params.image_url_input ?? null,
          uploaded_by: localDemoUser.id,
          caption: null,
          alt_text: params.name_input,
          sort_order: 0,
          is_cover: true,
          moderation_state: "accepted",
          deleted_at: null,
          created_at: now,
        });
      }
      return { data: true, error: null };
    }

    if (name === "borrow_item") {
      const item = itemById(tables, params.item_id_input);
      if (!item || item.status !== "inStock") return { data: false, error: null };
      Object.assign(item, { status: "borrowed", borrowed_by: localDemoUser.id });
      tables.borrow_history.push({
        id: demoId("demo-history"),
        item_id: item.id,
        borrower_id: localDemoUser.id,
        borrowed_at: now,
        returned_at: null,
        notes: "Local demo borrow.",
        created_at: now,
      });
      return { data: true, error: null };
    }

    if (name === "return_item") {
      const item = itemById(tables, params.item_id_input);
      if (!item || item.borrowed_by !== localDemoUser.id) return { data: false, error: null };
      Object.assign(item, { status: "inStock", borrowed_by: null });
      const history = [...tables.borrow_history].reverse().find((row) => row.item_id === item.id && row.returned_at === null);
      if (history) history.returned_at = now;
      return { data: true, error: null };
    }

    if (name === "delete_item") {
      const index = tables.items.findIndex((item) => item.id === params.item_id_input);
      if (index === -1) return { data: false, error: null };
      tables.items.splice(index, 1);
      return { data: true, error: null };
    }

    if (name === "create_item_suggestion") {
      tables.item_suggestions.push({
        id: demoId("demo-suggestion"),
        item_id: params.item_id_input,
        suggested_by: localDemoUser.id,
        suggestion_type: params.suggestion_type_input ?? "content",
        suggestion: params.suggestion_input,
        status: "pending",
        admin_note: null,
        reviewed_at: null,
        reviewed_by: null,
        created_at: now,
      });
      return { data: true, error: null };
    }

    if (name === "create_item_flag") {
      tables.item_flags.push({
        id: demoId("demo-flag"),
        item_id: params.item_id_input,
        flagged_by: localDemoUser.id,
        reason: params.reason_input ?? "other",
        note: params.note_input ?? null,
        status: "pending",
        admin_note: null,
        reviewed_at: null,
        reviewed_by: null,
        created_at: now,
      });
      return { data: true, error: null };
    }

    if (name === "request_item_visibility" || name === "set_item_visibility") {
      const item = itemById(tables, params.item_id_input);
      if (!item) return { data: false, error: null };
      Object.assign(item, {
        visibility_state: params.visibility_state_input ?? params.visibility_state ?? "visible",
        visibility_reason: params.reason_input ?? params.admin_note_input ?? null,
        hidden_by: localDemoUser.id,
        hidden_at: now,
      });
      return { data: true, error: null };
    }

    if (name === "review_item_suggestion") {
      const suggestion = tables.item_suggestions.find((row) => row.id === params.suggestion_id_input);
      if (!suggestion) return { data: false, error: null };
      Object.assign(suggestion, {
        status: params.status_input ?? suggestion.status,
        admin_note: params.admin_note_input ?? suggestion.admin_note,
        reviewed_at: now,
        reviewed_by: localDemoUser.id,
      });
      return { data: true, error: null };
    }

    if (name === "apply_item_suggestion") {
      const suggestion = tables.item_suggestions.find((row) => row.id === params.suggestion_id_input);
      if (!suggestion) return { data: false, error: null };
      const item = itemById(tables, suggestion.item_id);
      if (item) {
        pushVersion(tables, item, "Applied content suggestion");
        Object.assign(item, {
          name: params.name_input ?? item.name,
          description: params.description_input ?? null,
          image_url: params.image_url_input ?? item.image_url,
        });
      }
      Object.assign(suggestion, {
        status: "accepted",
        admin_note: params.admin_note_input ?? suggestion.admin_note,
        reviewed_at: now,
        reviewed_by: localDemoUser.id,
      });
      return { data: true, error: null };
    }

    if (name === "apply_owner_item_suggestion") {
      const suggestion = tables.item_suggestions.find((row) => row.id === params.suggestion_id_input);
      if (!suggestion) return { data: false, error: null };
      const item = itemById(tables, suggestion.item_id);
      if (item) {
        pushVersion(tables, item, "Applied owner suggestion");
        Object.assign(item, {
          owner_kind: params.owner_kind_input ?? item.owner_kind,
          owner_profile_id: params.owner_profile_id_input ?? null,
          owner_label: params.owner_label_input ?? null,
        });
      }
      Object.assign(suggestion, {
        status: "accepted",
        admin_note: params.admin_note_input ?? suggestion.admin_note,
        reviewed_at: now,
        reviewed_by: localDemoUser.id,
      });
      return { data: true, error: null };
    }

    if (name === "apply_item_image_suggestion") {
      const suggestion = tables.item_suggestions.find((row) => row.id === params.suggestion_id_input);
      if (!suggestion) return { data: false, error: null };
      const item = itemById(tables, suggestion.item_id);
      if (item) {
        const isCover = params.is_cover_input !== false;
        if (isCover) {
          for (const image of tables.item_images) {
            if (image.item_id === item.id) image.is_cover = false;
          }
          if (params.public_url_input) {
            Object.assign(item, { image_url: params.public_url_input });
          }
        }
        tables.item_images.push({
          id: demoId("demo-image"),
          item_id: item.id,
          storage_bucket: params.storage_bucket_input ?? "items",
          storage_path: params.storage_path_input,
          public_url: params.public_url_input ?? null,
          thumbnail_storage_path: null,
          thumbnail_public_url: params.public_url_input ?? null,
          uploaded_by: localDemoUser.id,
          caption: params.caption_input ?? null,
          alt_text: params.alt_text_input ?? item.name,
          sort_order: 0,
          is_cover: isCover,
          moderation_state: "accepted",
          deleted_at: null,
          created_at: now,
        });
      }
      Object.assign(suggestion, {
        status: "accepted",
        admin_note: params.admin_note_input ?? suggestion.admin_note,
        reviewed_at: now,
        reviewed_by: localDemoUser.id,
      });
      return { data: true, error: null };
    }

    if (name === "apply_item_change_request") {
      const suggestion = tables.item_suggestions.find((row) => row.id === params.suggestion_id_input);
      if (!suggestion) return { data: false, error: null };
      const item = itemById(tables, suggestion.item_id);
      if (item) {
        pushVersion(tables, item, "Applied change request");
        const nextVisibility = params.visibility_state_input ?? item.visibility_state ?? "visible";
        Object.assign(item, {
          name: params.name_input ?? item.name,
          description: params.description_input ?? null,
          image_url: params.image_url_input ?? item.image_url,
          owner_kind: params.owner_kind_input ?? item.owner_kind,
          owner_profile_id: params.owner_profile_id_input ?? null,
          owner_label: params.owner_label_input ?? null,
          visibility_state: nextVisibility,
          hidden_at: nextVisibility === "visible" ? null : now,
          hidden_by: nextVisibility === "visible" ? null : localDemoUser.id,
        });
      }
      Object.assign(suggestion, {
        status: "accepted",
        admin_note: params.admin_note_input ?? suggestion.admin_note,
        reviewed_at: now,
        reviewed_by: localDemoUser.id,
      });
      return { data: true, error: null };
    }

    if (name === "review_item_flag") {
      const flag = tables.item_flags.find((row) => row.id === params.flag_id_input);
      if (!flag) return { data: false, error: null };
      Object.assign(flag, {
        status: params.status_input ?? flag.status,
        admin_note: params.admin_note_input ?? flag.admin_note,
        reviewed_at: now,
        reviewed_by: localDemoUser.id,
      });
      return { data: true, error: null };
    }

    if (name === "get_my_invite_code") {
      return { data: "LOCAL-DEMO", error: null };
    }

    if (name === "set_my_invite_code") {
      const admin = tables.admins.find((row) => row.profile_id === localDemoUser.id);
      if (admin) admin.invite_code = params.invite_code_input;
      return { data: true, error: null };
    }

    if (name === "export_my_data") {
      return {
        data: {
          profile: cloneRow(tables.profiles.find((profile) => profile.id === localDemoUser.id)),
          items: cloneRow(tables.items.filter((item) => item.created_by === localDemoUser.id || item.borrowed_by === localDemoUser.id)),
        },
        error: null,
      };
    }

    if (name === "request_account_deletion") {
      tables.account_deletion_requests.push({
        id: demoId("demo-deletion"),
        user_id: localDemoUser.id,
        subject_user_id: localDemoUser.id,
        status: "pending",
        user_note: params.user_note_input ?? null,
        admin_note: null,
        requested_at: now,
        reviewed_at: null,
        reviewed_by: null,
        completed_at: null,
        created_at: now,
      });
      return { data: true, error: null };
    }

    return { data: true, error: null };
  };
}

export function createLocalDemoSupabaseClient() {
  const tables = loadDemoTables();
  const persist = () => saveDemoTables(tables);
  const rawRpc = buildRpcHandler(tables);
  const storageUrls = new Map<string, string>();
  const session = {
    access_token: "local-demo-access-token",
    refresh_token: "local-demo-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: localDemoUser,
  };

  return {
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
      async getUser() {
        return { data: { user: localDemoUser }, error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
      async signInWithOAuth() {
        return { data: { provider: "local-demo", url: null }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(tableName: string) {
      return new LocalDemoQueryBuilder(tables, tableName, persist);
    },
    rpc: async (name: string, params: DemoRow = {}) => {
      const result = await rawRpc(name, params);
      persist();
      return result;
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, body?: unknown) {
            storageUrls.set(`${bucket}/${path}`, demoStoragePublicUrl(bucket, path, body));
            return { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: storageUrls.get(`${bucket}/${path}`) ?? demoStoragePlaceholderUrl(bucket, path) } };
          },
          async remove(paths: string[]) {
            for (const path of paths) {
              storageUrls.delete(`${bucket}/${path}`);
            }
            return { data: paths, error: null };
          },
        };
      },
    },
    channel(name: string) {
      return {
        on() { return this; },
        subscribe() { return this; }
      };
    },
    removeChannel(channel: unknown) {
      return Promise.resolve({ error: null });
    }
  };
}
