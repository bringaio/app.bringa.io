import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildOAuthSignInErrorCopy,
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

test("builds non-secret OAuth error copy", () => {
  assert.equal(
    buildOAuthSignInErrorCopy("GitHub"),
    "GitHub sign-in could not start. Check the app setup and try again.",
  );
  assert.equal(
    buildOAuthSignInErrorCopy("Google"),
    "Google sign-in could not start. Check the app setup and try again.",
  );
});

test("default terms disclose necessary session storage without introducing a banner requirement", async () => {
  const terms = await readFile(new URL("../content/default/legal/en.md", import.meta.url), "utf8");

  assert.match(terms, /## 5\. Session Storage/);
  assert.match(terms, /necessary authentication session storage/);
  assert.match(terms, /not used for advertising, cross-site tracking, or analytics/);
  assert.match(terms, /add any consent controls required/);
});
