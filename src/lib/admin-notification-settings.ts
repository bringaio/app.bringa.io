export type AdminNotificationSettingsInput = {
  telegramAdminNotifications: boolean;
  notificationEvents?: AdminNotificationEvent[];
  notificationMutes?: AdminNotificationMute[];
  now?: Date;
};

export type AdminNotificationSectionKey = "telegram" | "mute" | "dedupe" | "seen";

export type AdminNotificationEvent = {
  status: string | null;
  seen_at: string | null;
};

export type AdminNotificationMute = {
  muted_forever: boolean | null;
  muted_until: string | null;
  revoked_at: string | null;
};

export type AdminNotificationSection = {
  key: AdminNotificationSectionKey;
  label: string;
  status: "Configured" | "Disabled" | "Prepared";
  detail: string;
};

export type AdminNotificationSettings = {
  sections: AdminNotificationSection[];
  muteWindows: string[];
};

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function isActiveMute(mute: AdminNotificationMute, now: Date): boolean {
  if (mute.revoked_at) {
    return false;
  }
  if (mute.muted_forever) {
    return true;
  }
  if (!mute.muted_until) {
    return false;
  }

  return new Date(mute.muted_until).getTime() > now.getTime();
}

function buildMuteSection(mutes: AdminNotificationMute[] | undefined, now: Date): AdminNotificationSection {
  if (!mutes) {
    return {
      key: "mute",
      label: "Mute windows",
      status: "Prepared",
      detail: "Operator choices for user-level notification muting.",
    };
  }

  const activeMutes = mutes.filter((mute) => isActiveMute(mute, now)).length;

  return {
    key: "mute",
    label: "Mute windows",
    status: "Configured",
    detail: activeMutes
      ? `${activeMutes} active ${pluralize(activeMutes, "mute")}; muted events are recorded without Telegram delivery.`
      : "No active mutes; admins can mute noisy notification subjects through the RPC contract.",
  };
}

function buildDedupeSection(events: AdminNotificationEvent[] | undefined): AdminNotificationSection {
  if (!events) {
    return {
      key: "dedupe",
      label: "Dedupe",
      status: "Prepared",
      detail: "One notification per unseen user queue until admin review.",
    };
  }

  const unseenEvents = events.filter((event) => !event.seen_at && event.status !== "skipped_muted").length;

  return {
    key: "dedupe",
    label: "Dedupe",
    status: "Configured",
    detail: unseenEvents
      ? `${unseenEvents} unseen ${pluralize(unseenEvents, "notification")} ${unseenEvents === 1 ? "is" : "are"} suppressing duplicates until admin review.`
      : "No unseen notifications are currently suppressing duplicates.",
  };
}

function buildSeenSection(events: AdminNotificationEvent[] | undefined): AdminNotificationSection {
  if (!events) {
    return {
      key: "seen",
      label: "Admin seen-state",
      status: "Prepared",
      detail: "Review state for future queue notification throttling.",
    };
  }

  const seenEvents = events.filter((event) => Boolean(event.seen_at)).length;

  return {
    key: "seen",
    label: "Admin seen-state",
    status: "Configured",
    detail: seenEvents
      ? `${seenEvents} ${pluralize(seenEvents, "notification")} ${seenEvents === 1 ? "has" : "have"} been marked seen by an admin.`
      : "No notification has been marked seen yet.",
  };
}

export function buildAdminNotificationSettings(
  input: AdminNotificationSettingsInput,
): AdminNotificationSettings {
  const now = input.now ?? new Date();

  return {
    sections: [
      {
        key: "telegram",
        label: "Telegram",
        status: input.telegramAdminNotifications ? "Configured" : "Disabled",
        detail: "Deployment-level notification switch.",
      },
      buildMuteSection(input.notificationMutes, now),
      buildDedupeSection(input.notificationEvents),
      buildSeenSection(input.notificationEvents),
    ],
    muteWindows: ["1 day", "1 week", "Forever"],
  };
}
