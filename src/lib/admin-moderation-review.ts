import type { ItemFlagStatus, ItemSuggestionStatus } from "@/app/model/model";

export type AdminModerationReviewStatus = Exclude<ItemSuggestionStatus, "pending"> | Exclude<ItemFlagStatus, "pending">;

export type AdminModerationReviewNoteResult = {
  ok: boolean;
  adminNote: string | null;
};

export function moderationReviewRequiresNote(status: AdminModerationReviewStatus): boolean {
  return status !== "reviewing";
}

export function buildAdminModerationReviewNote({
  status,
  note,
}: {
  status: AdminModerationReviewStatus;
  note: string;
}): AdminModerationReviewNoteResult {
  const adminNote = note.trim() || null;

  if (moderationReviewRequiresNote(status) && (!adminNote || adminNote.length < 3)) {
    return { ok: false, adminNote: null };
  }

  return { ok: true, adminNote };
}
