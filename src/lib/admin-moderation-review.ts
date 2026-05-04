import type { ItemFlagStatus, ItemSuggestionStatus } from "@/app/model/model";

export type AdminModerationReviewStatus = Exclude<ItemSuggestionStatus, "pending"> | Exclude<ItemFlagStatus, "pending">;

export type AdminModerationReviewNoteResult = {
  ok: boolean;
  adminNote: string | null;
};

export type AcceptedSuggestionApplicationResult = {
  ok: boolean;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
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

export function buildAcceptedSuggestionApplication({
  name,
  description,
  imageUrl,
  note,
}: {
  name: string;
  description: string;
  imageUrl: string;
  note: string;
}): AcceptedSuggestionApplicationResult {
  const normalizedName = name.trim() || null;
  const normalizedDescription = description.trim() || null;
  const normalizedImageUrl = imageUrl.trim() || null;
  const adminNote = note.trim() || null;

  if (!normalizedName || !adminNote || adminNote.length < 3) {
    return {
      ok: false,
      name: null,
      description: null,
      imageUrl: null,
      adminNote: null,
    };
  }

  return {
    ok: true,
    name: normalizedName,
    description: normalizedDescription,
    imageUrl: normalizedImageUrl,
    adminNote,
  };
}
