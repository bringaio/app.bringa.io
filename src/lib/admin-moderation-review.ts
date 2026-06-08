import type { ItemOwnerKind, ItemVisibilityState } from "@/app/model/model";

export type ItemChangeApplicationResult = {
  ok: boolean;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  ownerKind: ItemOwnerKind | null;
  ownerProfileId: string | null;
  ownerLabel: string | null;
  visibilityState: ItemVisibilityState | null;
};

const ownerKinds = new Set<ItemOwnerKind>(["operator", "profile", "free_text"]);
const visibilityStates = new Set<ItemVisibilityState>([
  "visible",
  "user_hidden",
  "admin_hidden",
  "pending_visible",
  "deleted_user_hidden",
  "archived",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const failedApplication: ItemChangeApplicationResult = {
  ok: false,
  name: null,
  description: null,
  imageUrl: null,
  ownerKind: null,
  ownerProfileId: null,
  ownerLabel: null,
  visibilityState: null,
};

/**
 * Validate the admin's inline "Accept Changes" form. A change request edits the
 * whole item at once: name (required), description, image, owner, and visibility.
 * No admin note is required — accepting the change is the review decision.
 */
export function buildItemChangeApplication({
  name,
  description,
  imageUrl,
  ownerKind,
  ownerProfileId,
  ownerLabel,
  visibilityState,
}: {
  name: string;
  description: string;
  imageUrl: string;
  ownerKind: string;
  ownerProfileId: string;
  ownerLabel: string;
  visibilityState: string;
}): ItemChangeApplicationResult {
  const normalizedName = name.trim() || null;
  const normalizedDescription = description.trim() || null;
  const normalizedImageUrl = imageUrl.trim() || null;
  const normalizedKind = ownerKind.trim() as ItemOwnerKind;
  const normalizedProfileId = ownerProfileId.trim() || null;
  const normalizedLabel = ownerLabel.trim() || null;
  const normalizedVisibility = visibilityState.trim() as ItemVisibilityState;

  if (!normalizedName) return failedApplication;
  if (!ownerKinds.has(normalizedKind)) return failedApplication;
  if (!visibilityStates.has(normalizedVisibility)) return failedApplication;
  if (normalizedKind === "profile" && (!normalizedProfileId || !uuidPattern.test(normalizedProfileId))) {
    return failedApplication;
  }
  if (normalizedKind === "free_text" && !normalizedLabel) return failedApplication;

  return {
    ok: true,
    name: normalizedName,
    description: normalizedDescription,
    imageUrl: normalizedImageUrl,
    ownerKind: normalizedKind,
    ownerProfileId: normalizedKind === "profile" ? normalizedProfileId : null,
    ownerLabel: normalizedKind === "free_text" ? normalizedLabel : null,
    visibilityState: normalizedVisibility,
  };
}
