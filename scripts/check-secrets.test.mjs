import assert from "node:assert/strict";
import test from "node:test";

import {
  findCommittedSecretCandidates,
  findSecretCandidatesInContent,
} from "./check-secrets.mjs";

function fakeJwtWithPayload(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.fake-signature`;
}

test("allows documented variable names, placeholders, and redacted examples", () => {
  const content = `
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=<server-only legacy service_role key>
SUPABASE_SECRET_KEY=
SUPABASE_SECRET_KEY=<server-only secret key>
Use SUPABASE_SERVICE_ROLE_KEY only in .env.local.
Use SUPABASE_SECRET_KEY only in .env.local.
Authorization: Bearer REDACTED_SUPABASE_SERVICE_ROLE_JWT
`;

  assert.deepEqual(findSecretCandidatesInContent("docs/example.md", content), []);
});

test("rejects committed Supabase secret API keys and nonblank service-role assignments", () => {
  const fakeSecretKey = "sb_secret_" + "abcdefghijklmnopqrstuvwxyz123456";
  const serviceRoleKeyName = "SUPABASE_SERVICE_ROLE_KEY";
  const secretKeyName = "SUPABASE_SECRET_KEY";
  const content = `
${serviceRoleKeyName}=not-for-git
${secretKeyName}=also-not-for-git
EXAMPLE_SECRET=${fakeSecretKey}
`;

  const matches = findSecretCandidatesInContent(".env.production", content);
  assert.equal(matches.length, 3);
  assert.equal(matches[0].kind, "nonblank Supabase service role assignment");
  assert.equal(matches[1].kind, "nonblank Supabase secret key assignment");
  assert.equal(matches[2].kind, "Supabase secret API key");
});

test("rejects legacy JWTs that decode to the service_role role", () => {
  const jwt = fakeJwtWithPayload({
    iss: "supabase",
    role: "service_role",
  });

  const matches = findSecretCandidatesInContent("notes.txt", `key=${jwt}`);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].kind, "legacy Supabase service_role JWT");
});

test("scans a file map and returns locations without exposing secret values", async () => {
  const files = new Map([
    ["README.md", "SUPABASE_SERVICE_ROLE_KEY=<server-only legacy service_role key>\n"],
    ["bad.env", "SUPABASE_SECRET_KEY=do-not-commit\n"],
  ]);

  const matches = await findCommittedSecretCandidates({ files });
  assert.deepEqual(matches, [{
    filePath: "bad.env",
    lineNumber: 1,
    kind: "nonblank Supabase secret key assignment",
  }]);
});
