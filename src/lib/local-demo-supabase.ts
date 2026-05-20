type DemoRow = Record<string, unknown>;

type QueryResult<T> = {
  data: T;
  error: Error | null;
  count?: number | null;
};

type Filter =
  | { type: "eq"; column: string; value: unknown }
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

class LocalDemoQueryBuilder {
  private readonly tables: DemoTables;
  private readonly tableName: string;
  private columns: string | undefined;
  private countMode: "exact" | null = null;
  private head = false;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private singleMode: "single" | "maybeSingle" | null = null;
  private updateValues: DemoRow | null = null;

  constructor(tables: DemoTables, tableName: string) {
    this.tables = tables;
    this.tableName = tableName;
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

  private async execute(): Promise<QueryResult<unknown>> {
    const table = this.tables[this.tableName] ?? [];
    let rows = table.filter((row) => this.filters.every((filter) => rowMatchesFilter(row, filter)));

    if (this.updateValues) {
      for (const row of rows) {
        Object.assign(row, this.updateValues, { updated_at: now });
      }
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

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    const count = this.countMode === "exact" ? rows.length : null;
    if (this.head) {
      return { data: null, error: null, count };
    }

    const projectedRows = rows.map((row) => projectRow(row, this.columns));

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
  const tables = createDemoTables();
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
      return new LocalDemoQueryBuilder(tables, tableName);
    },
    rpc: buildRpcHandler(tables),
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
