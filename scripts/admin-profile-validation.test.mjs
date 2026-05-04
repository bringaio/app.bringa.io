import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminProfileValidationAction,
  profileDisplayName,
} from "../src/lib/admin-profile-validation.ts";

test("builds validation actions without allowing self invalidation", () => {
  assert.deepEqual(
    buildAdminProfileValidationAction({ profileId: "user-1", currentUserId: "admin-1", profileValid: false }),
    { action: "validate", disabled: false, label: "Validate" },
  );

  assert.deepEqual(
    buildAdminProfileValidationAction({ profileId: "user-1", currentUserId: "admin-1", profileValid: true }),
    { action: "invalidate", disabled: false, label: "Revoke access" },
  );

  assert.deepEqual(
    buildAdminProfileValidationAction({ profileId: "admin-1", currentUserId: "admin-1", profileValid: true }),
    { action: "invalidate", disabled: true, label: "You" },
  );
});

test("formats compact profile display names", () => {
  assert.equal(profileDisplayName({ display_name: "Ada", display_surname: "Lovelace", email: "ada@example.test" }), "Ada Lovelace");
  assert.equal(profileDisplayName({ display_name: "", display_surname: "", email: "person@example.test" }), "person@example.test");
  assert.equal(profileDisplayName({ display_name: null, display_surname: null, email: null }), "Unnamed user");
});
