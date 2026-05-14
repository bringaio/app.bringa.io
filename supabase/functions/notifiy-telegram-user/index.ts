import "jsr:@supabase/functions-js/edge-runtime.d.ts"

type NotificationRecord = {
  id: string;
  payload?: {
    title?: string;
    url_path?: string;
  };
  source_id?: string | null;
};

type WebhookPayload = {
  record?: {
    id?: string;
  };
};

type WebhookAuthResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function appUrl() {
  return (Deno.env.get("APP_URL") || "https://app.bringa.io").replace(/\/$/, "");
}

function buildMessage(record: NotificationRecord) {
  const title = record.payload?.title || "Profile activity";
  const path = record.payload?.url_path || "/admin/users";

  return `${title}\n\n${appUrl()}${path}`;
}

function notificationEventId(record: NotificationRecord) {
  return record.id;
}

function secretKeyFromMap() {
  const value = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!value) {
    return undefined;
  }

  try {
    const keys = JSON.parse(value) as Record<string, unknown>;
    const defaultKey = keys.default;
    return typeof defaultKey === "string" && defaultKey.trim() ? defaultKey : undefined;
  } catch {
    console.warn("Ignoring invalid SUPABASE_SECRET_KEYS JSON");
    return undefined;
  }
}

function supabaseAdminKey() {
  return Deno.env.get("SUPABASE_SECRET_KEY") ||
    secretKeyFromMap() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

function verifyWebhookSecret(req: Request): WebhookAuthResult {
  const configuredSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!configuredSecret) {
    return { ok: false, status: 500, message: "Server configuration error" };
  }

  const providedSecret = req.headers.get("x-bringa-webhook-secret");
  if (providedSecret !== configuredSecret) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true };
}

function eventIdFromPayload(payload: WebhookPayload) {
  return typeof payload.record?.id === "string" && payload.record.id.trim()
    ? payload.record.id
    : undefined;
}

async function fetchNotificationEvent(eventId: string): Promise<NotificationRecord | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = supabaseAdminKey();
  if (!supabaseUrl || !adminKey) {
    throw new Error("missing Supabase admin key configuration");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/notification_events?id=eq.${encodeURIComponent(eventId)}&select=id,payload,source_id`,
    {
      headers: {
        "apikey": adminKey,
        "Authorization": `Bearer ${adminKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`notification event lookup failed: ${response.status}`);
  }

  const rows = await response.json() as NotificationRecord[];
  return rows[0] ?? null;
}

async function recordDelivery(eventId: string | undefined, status: "sent" | "failed", error?: string) {
  if (!eventId) {
    return;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = supabaseAdminKey();
  if (!supabaseUrl || !adminKey) {
    console.warn("Skipping notification delivery status write: missing Supabase admin key configuration");
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_notification_delivery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": adminKey,
      "Authorization": `Bearer ${adminKey}`,
    },
    body: JSON.stringify({
      event_id_input: eventId,
      status_input: status,
      error_input: error || null,
    }),
  });

  if (!response.ok) {
    console.error("Failed to record notification delivery status:", await response.text());
  }
}

Deno.serve(async (req) => {
  try {
    const auth = verifyWebhookSecret(req);
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }

    const payload = await req.json() as WebhookPayload;
    const eventId = eventIdFromPayload(payload);

    if (!eventId) {
      console.error("Invalid notification payload received");
      return jsonResponse({ error: "Invalid payload" }, 400);
    }

    const event = await fetchNotificationEvent(eventId);
    if (!event) {
      await recordDelivery(eventId, "failed", "Notification event not found");
      return jsonResponse({ error: "Notification event not found" }, 404);
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN_USER");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID_USER");

    if (!botToken || !chatId) {
      console.error("Missing environment variables: TELEGRAM_BOT_TOKEN_USER or TELEGRAM_CHAT_ID_USER");
      await recordDelivery(notificationEventId(event), "failed", "Server configuration error");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    let tgResponse: Response;
    try {
      tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildMessage(event),
        }),
      });
    } catch {
      console.error("Telegram API request failed before receiving a response");
      await recordDelivery(notificationEventId(event), "failed", "Telegram request failed");
      return jsonResponse({ error: "Telegram delivery failed" }, 502);
    }

    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      console.error("Telegram API error:", errorText);
      await recordDelivery(notificationEventId(event), "failed", errorText);
      return jsonResponse({ error: "Telegram delivery failed" }, 502);
    }

    await recordDelivery(notificationEventId(event), "sent");
    return jsonResponse({ status: "ok" }, 200);
  } catch {
    console.error("Internal service error");
    return jsonResponse({ error: "Internal server error" }, 500);
  }
})
