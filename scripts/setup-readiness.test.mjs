import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSetupRequiredCopy,
  evaluateSetupReadiness,
} from "../src/lib/setup-readiness.ts";

const connectedForkConfig = {
  app: {
    canonicalUrl: "https://share.example.org",
  },
  repository: {
    templateMode: "fork",
  },
  supabase: {
    url: "https://abc123.supabase.co",
    publishableKey: "sb_publishable_abc123",
  },
  development: {
    localDemoMode: false,
  },
};

test("accepts a connected production fork", () => {
  assert.deepEqual(evaluateSetupReadiness({
    config: connectedForkConfig,
    currentOrigin: "https://share.example.org",
    nodeEnv: "production",
  }), {
    status: "ready",
    issues: [],
  });
});

test("reports scaffold Supabase placeholders in production", () => {
  const result = evaluateSetupReadiness({
    config: {
      ...connectedForkConfig,
      supabase: {
        url: "https://replace-with-your-project-ref.supabase.co",
        publishableKey: "replace-with-your-public-publishable-key",
      },
    },
    currentOrigin: "https://share.example.org",
    nodeEnv: "production",
  });

  assert.equal(result.status, "setup-required");
  assert.deepEqual(result.issues, ["placeholder-supabase-url", "placeholder-publishable-key"]);
});

test("reports upstream config served from a fork origin", () => {
  const result = evaluateSetupReadiness({
    config: {
      ...connectedForkConfig,
      app: {
        canonicalUrl: "https://app.bringa.io",
      },
      repository: {
        templateMode: "upstream",
      },
    },
    currentOrigin: "https://share.example.org",
    nodeEnv: "production",
  });

  assert.deepEqual(result, {
    status: "setup-required",
    issues: ["upstream-origin-mismatch"],
  });
});

test("waits for browser origin before judging upstream production config", () => {
  assert.deepEqual(evaluateSetupReadiness({
    config: {
      ...connectedForkConfig,
      repository: {
        templateMode: "upstream",
      },
    },
    currentOrigin: null,
    nodeEnv: "production",
  }), {
    status: "checking",
    issues: [],
  });
});

test("reports local Supabase URLs in production", () => {
  const result = evaluateSetupReadiness({
    config: {
      ...connectedForkConfig,
      supabase: {
        url: "http://127.0.0.1:54321",
        publishableKey: "sb_publishable_local",
      },
    },
    currentOrigin: "https://share.example.org",
    nodeEnv: "production",
  });

  assert.equal(result.status, "setup-required");
  assert.deepEqual(result.issues, ["local-supabase-production"]);
});

test("keeps local development and demo mode out of the setup gate", () => {
  assert.deepEqual(evaluateSetupReadiness({
    config: {
      ...connectedForkConfig,
      supabase: {
        url: "http://127.0.0.1:54321",
        publishableKey: "local-development-publishable-key",
      },
      development: {
        localDemoMode: true,
      },
    },
    currentOrigin: "http://localhost:3000",
    nodeEnv: "development",
  }), {
    status: "ready",
    issues: [],
  });
});

test("builds compact setup-required copy with docs links", () => {
  assert.deepEqual(buildSetupRequiredCopy(), {
    title: "Setup required",
    description: "This deployment is not connected to its own Supabase project yet.",
    steps: [
      "Configure the fork deployment profile.",
      "Connect Supabase, OAuth, and the first admin.",
      "Publish with GitHub Pages, DNS, and enforced HTTPS.",
    ],
    guideHref: "/docs?doc=fork-launch-runbook",
    docsHref: "/docs",
  });
});

test("login page does not statically import Supabase-bound auth controls", async () => {
  const content = await readFile(new URL("../src/app/login/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(content, /@\/lib\/supabaseclient/);
  assert.doesNotMatch(content, /@\/components\/auth\/git-signin-button/);
  assert.doesNotMatch(content, /@\/components\/auth\/google-signin-button/);
  assert.match(content, /@\/components\/auth\/login-auth-options/);
});
