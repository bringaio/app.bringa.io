import type { ItemFlagStatus, ItemOwnerKind, ItemSuggestionStatus } from "@/app/model/model";

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

export type OwnerSuggestionApplicationResult = {
  ok: boolean;
  ownerKind: ItemOwnerKind | null;
  ownerProfileId: string | null;
  ownerLabel: string | null;
  adminNote: string | null;
};

export type ImageSuggestionApplicationResult = {
  ok: boolean;
  storageBucket: string | null;
  storagePath: string | null;
  publicUrl: string | null;
  caption: string | null;
  altText: string | null;
  isCover: boolean;
  adminNote: string | null;
};

const ownerKinds = new Set<ItemOwnerKind>(["operator", "profile", "free_text"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSafeStoragePath(value: string): boolean {
  return Boolean(value)
    && !value.startsWith("/")
    && !value.split(/[\\/]+/).includes("..");
}

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

export function buildOwnerSuggestionApplication({
  ownerKind,
  ownerProfileId,
  ownerLabel,
  note,
}: {
  ownerKind: string;
  ownerProfileId: string;
  ownerLabel: string;
  note: string;
}): OwnerSuggestionApplicationResult {
  const normalizedKind = ownerKind.trim() as ItemOwnerKind;
  const normalizedProfileId = ownerProfileId.trim() || null;
  const normalizedLabel = ownerLabel.trim() || null;
  const adminNote = note.trim() || null;

  if (!ownerKinds.has(normalizedKind) || !adminNote || adminNote.length < 3) {
    return {
      ok: false,
      ownerKind: null,
      ownerProfileId: null,
      ownerLabel: null,
      adminNote: null,
    };
  }

  if (normalizedKind === "profile") {
    if (!normalizedProfileId || !uuidPattern.test(normalizedProfileId)) {
      return {
        ok: false,
        ownerKind: null,
        ownerProfileId: null,
        ownerLabel: null,
        adminNote: null,
      };
    }

    return {
      ok: true,
      ownerKind: normalizedKind,
      ownerProfileId: normalizedProfileId,
      ownerLabel: null,
      adminNote,
    };
  }

  if (normalizedKind === "free_text" && !normalizedLabel) {
    return {
      ok: false,
      ownerKind: null,
      ownerProfileId: null,
      ownerLabel: null,
      adminNote: null,
    };
  }

  return {
    ok: true,
    ownerKind: normalizedKind,
    ownerProfileId: null,
    ownerLabel: normalizedLabel,
    adminNote,
  };
}

export function buildImageSuggestionApplication({
  storageBucket,
  storagePath,
  publicUrl,
  caption,
  altText,
  isCover,
  note,
}: {
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  caption: string;
  altText: string;
  isCover: boolean;
  note: string;
}): ImageSuggestionApplicationResult {
  const normalizedBucket = storageBucket.trim() || "items";
  const normalizedPath = storagePath.trim();
  const normalizedPublicUrl = publicUrl.trim() || null;
  const normalizedCaption = caption.trim() || null;
  const normalizedAltText = altText.trim() || null;
  const adminNote = note.trim() || null;

  if (
    !normalizedBucket
    || !isSafeStoragePath(normalizedPath)
    || !normalizedAltText
    || normalizedAltText.length < 3
    || !adminNote
    || adminNote.length < 3
  ) {
    return {
      ok: false,
      storageBucket: null,
      storagePath: null,
      publicUrl: null,
      caption: null,
      altText: null,
      isCover: false,
      adminNote: null,
    };
  }

  return {
    ok: true,
    storageBucket: normalizedBucket,
    storagePath: normalizedPath,
    publicUrl: normalizedPublicUrl,
    caption: normalizedCaption,
    altText: normalizedAltText,
    isCover,
    adminNote,
  };
}
