import "jsr:@supabase/functions-js/edge-runtime.d.ts"

type NotificationRecord = {
  id?: string;
  payload?: {
    title?: string;
    url_path?: string;
  };
  display_name?: string | null;
  display_surname?: string | null;
};

type WebhookPayload = {
  record?: NotificationRecord;
};

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
  return record.payload ? record.id : undefined;
}

async function recordDelivery(eventId: string | undefined, status: "sent" | "failed", error?: string) {
  if (!eventId) {
    return;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Skipping notification delivery status write: missing Supabase service role configuration");
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_notification_delivery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
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
    const payload = await req.json() as WebhookPayload;
    const profile = payload.record;

    if (!profile || !profile.id) {
      console.error("Invalid payload received:", payload);
      return jsonResponse({ error: "Invalid payload" }, 400);
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN_USER");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID_USER");

    if (!botToken || !chatId) {
      console.error("Missing environment variables: TELEGRAM_BOT_TOKEN_USER or TELEGRAM_CHAT_ID_USER");
      await recordDelivery(notificationEventId(profile), "failed", "Server configuration error");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildMessage(profile),
      }),
    });

    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      console.error("Telegram API error:", errorText);
      await recordDelivery(notificationEventId(profile), "failed", errorText);
      return jsonResponse({ error: "Telegram delivery failed" }, 502);
    }

    await recordDelivery(notificationEventId(profile), "sent");
    return jsonResponse({ status: "ok" }, 200);
  } catch (error) {
    console.error("Internal service error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
})
