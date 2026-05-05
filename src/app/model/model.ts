export type ItemOwnerKind = "operator" | "profile" | "free_text";
export type ItemVisibilityState =
  | "visible"
  | "user_hidden"
  | "admin_hidden"
  | "pending_visible"
  | "deleted_user_hidden"
  | "archived";
export type ItemHandoffPolicy = "return_to_owner" | "direct_handoff_allowed";
export type ItemSuggestionType = "content" | "image" | "visibility" | "owner" | "other";
export type ItemSuggestionStatus = "pending" | "reviewing" | "accepted" | "rejected" | "closed";
export type ItemFlagReason = "incorrect" | "unavailable" | "unsafe" | "image" | "spam" | "other";
export type ItemFlagStatus = "pending" | "reviewing" | "resolved" | "dismissed";
export type AccountDeletionRequestStatus = "pending" | "reviewing" | "completed" | "cancelled";

export interface ItemDb {
  id: string; // UUID
  created_at?: string | null;
  borrowed_by: string | null; // UUID of the borrower
  name: string;
  description: string | null;
  status: "inStock" | "borrowed";
  image_url: string | null; // Matches DB column name
  created_by: string | null;
  owner_kind?: ItemOwnerKind | null;
  owner_profile_id?: string | null;
  owner_label?: string | null;
  visibility_state?: ItemVisibilityState | null;
  visibility_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  handoff_policy?: ItemHandoffPolicy | null;
}

export interface ItemVersion {
  id: string;
  item_id: string;
  version_number: number;
  name: string | null;
  description: string | null;
  image_url: string | null;
  owner_kind: ItemOwnerKind;
  owner_profile_id: string | null;
  owner_label: string | null;
  visibility_state: ItemVisibilityState;
  actor_id: string | null;
  reason: string | null;
  created_at: string | null;
}

export interface BorrowedItem extends ItemDb {
  status: "borrowed";
}

export interface Member {
  id: string; // UUID
  name: string;
  surname: string;
  email: string;
  password: string;
  organisation: string;
  borrowedItems: BorrowedItem[];
}

export interface Organization {
  id: number;
  name: string;
  location: string;
  members: Member[];
  items: ItemDb[];
}

export interface Profile {
  id: string; // UUID
  email: string | null;
  display_name: string | null;
  display_surname: string | null;
  avatar_url: string | null;
  description: string | null;
  profile_valid: boolean; // Whether user has entered valid invite code
  invited_by_code: string | null; // The invite code used by this user
  created_at: string;
  updated_at: string;
}

export interface BorrowHistory {
  id: string; // UUID
  item_id: string;
  borrower_id: string;
  borrowed_at: string;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface BorrowHistoryWithProfile extends BorrowHistory {
  borrower: Profile;
}

export interface Admin {
  id: string; // UUID
  profile_id: string;
  invite_code: string; // Unique invite code for this admin
  created_at: string;
}

export interface ItemSuggestion {
  id: string;
  item_id: string;
  suggested_by: string | null;
  suggestion_type: ItemSuggestionType;
  suggestion: string;
  status: ItemSuggestionStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface ItemFlag {
  id: string;
  item_id: string;
  flagged_by: string | null;
  reason: ItemFlagReason;
  note: string | null;
  status: ItemFlagStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string | null;
  subject_user_id: string;
  status: AccountDeletionRequestStatus;
  user_note: string | null;
  admin_note: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  completed_at: string | null;
  created_at: string | null;
}
