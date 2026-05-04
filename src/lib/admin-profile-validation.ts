type ProfileNameInput = {
  display_name?: string | null;
  display_surname?: string | null;
  email?: string | null;
};

export type AdminProfileValidationAction = {
  action: "validate" | "invalidate";
  disabled: boolean;
  label: string;
};

export function profileDisplayName(profile: ProfileNameInput): string {
  const name = `${profile.display_name || ""} ${profile.display_surname || ""}`.trim();
  return name || profile.email || "Unnamed user";
}

export function buildAdminProfileValidationAction({
  profileId,
  currentUserId,
  profileValid,
}: {
  profileId: string;
  currentUserId: string | null;
  profileValid: boolean;
}): AdminProfileValidationAction {
  const action = profileValid ? "invalidate" : "validate";
  const isSelfInvalidation = action === "invalidate" && profileId === currentUserId;

  if (isSelfInvalidation) {
    return { action, disabled: true, label: "You" };
  }

  return {
    action,
    disabled: false,
    label: action === "validate" ? "Validate" : "Revoke access",
  };
}
