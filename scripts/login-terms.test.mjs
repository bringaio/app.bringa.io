import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLoginCopy,
  buildLoginOAuthGate,
  normalizeTermsAccepted,
} from "../src/lib/login-terms.ts";

test("normalizes checkbox states for terms acceptance", () => {
  assert.equal(normalizeTermsAccepted(true), true);
  assert.equal(normalizeTermsAccepted(false), false);
  assert.equal(normalizeTermsAccepted("indeterminate"), false);
});

test("gates OAuth sign-in buttons behind accepted terms", () => {
  assert.deepEqual(buildLoginOAuthGate({ termsAccepted: false }), {
    disabled: true,
  });
  assert.deepEqual(buildLoginOAuthGate({ termsAccepted: true }), {
    disabled: false,
  });
});

test("builds login copy from the configured terms path", () => {
  assert.deepEqual(buildLoginCopy({ termsPath: "/terms" }), {
    title: "Sign in",
    termsLabelPrefix: "I accept the",
    termsLinkLabel: "Terms and Privacy Notes",
    termsPath: "/terms",
  });
});
