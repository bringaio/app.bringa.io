import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildConfigArtifacts, loadConfigObject, resolveDeploymentSlug } from "./generate-config.mjs";

const completeBaseConfig = {
  $schema: "./bringa.config.schema.json",
  app: {
    name: "Base",
    shortName: "base",
    description: "Base description.",
    defaultLocale: "en",
    locales: ["en", "de"],
    titleTemplate: "%s | Base",
    canonicalUrl: "https://base.example",
    homeHref: "/dashboard",
  },
  branding: {
    logoText: "Base",
    logoPath: "/icon.svg",
    iconPath: "/icon.svg",
    appleTouchIconPath: "/icon.svg",
    themeColor: "#ffffff",
    backgroundColor: "#ffffff",
    bornAndHostedBy: "Born by Base",
  },
  operator: {
    organizationName: "Base Operator",
    defaultOwnerLabel: "Base Operator",
    contactEmail: "",
    privacyEmail: "",
    jurisdiction: "",
  },
  repository: {
    provider: "github",
    owner: "base",
    name: "base-app",
    url: "https://github.com/base/base-app",
    issuesUrl: "https://github.com/base/base-app/issues",
    discussionsUrl: "",
    templateMode: "upstream",
  },
  content: {
    sourcePath: "content/default",
    deploymentPath: "content/deployments",
    publicPath: "/content/generated",
    issuePromptPath: "/content/generated/issues/en.md",
    requiredFiles: ["legal/en.md", "onboarding/en.md"],
  },
  legal: {
    termsPath: "/terms",
    termsContentPath: "/content/generated/legal/en.md",
    contentContributionLabel: "Base contribution label",
    itemGiftLabel: "Base gift label",
    publicDomainIntent: true,
  },
  supabase: {
    url: "",
    publishableKey: "",
    authRedirectPath: "/dashboard",
  },
  invites: {
    allowSignupWithoutInvite: false,
    collectDisplayNameBeforeInvite: true,
  },
  media: {
    acceptedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxUploadBytes: 10485760,
    compressionMaxSizeMb: 1,
    compressionMaxWidthOrHeight: 1920,
  },
  features: {
    githubLinkInTopbar: true,
    showBorrowedFirstOnlyWhenActive: true,
    telegramAdminNotifications: true,
    itemVersioning: false,
    profilePages: false,
  },
};

async function writeJsonc(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createConfigProject({ deployment = {}, local = undefined, deploymentContent = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bringa-config-test-"));

  await writeJsonc(path.join(root, "config", "base.config.jsonc"), completeBaseConfig);
  await writeJsonc(path.join(root, "config", "deployments", "app.bringa.io.jsonc"), deployment);

  if (local) {
    await writeJsonc(path.join(root, "config", "local.config.jsonc"), local);
  }

  const publicFiles = [
    "icon.svg",
    "logo.svg",
    "content/generated/legal/en.md",
    "content/generated/issues/en.md",
    "content/local/legal/en.md",
  ];

  for (const publicFile of publicFiles) {
    const filePath = path.join(root, "public", publicFile);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, publicFile.endsWith(".svg") ? "<svg />\n" : "# Terms\n");
  }

  const defaultContent = {
    "legal/en.md": "# Default Terms\n",
    "onboarding/en.md": "# Default Onboarding\n",
  };

  for (const [contentPath, content] of Object.entries(defaultContent)) {
    const filePath = path.join(root, "content", "default", contentPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  for (const [contentPath, content] of Object.entries(deploymentContent)) {
    const filePath = path.join(root, "content", "deployments", "app.bringa.io", contentPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  return root;
}

test("loads base config with deployment overrides and strips layer schemas", async (t) => {
  const root = await createConfigProject({
    deployment: {
      $schema: "../bringa.config.schema.json",
      app: {
        name: "Community Portal",
        locales: ["de"],
      },
      branding: {
        logoText: "Community",
        logoPath: "/logo.svg",
      },
      repository: {
        owner: "community",
        name: "portal",
        url: "https://github.com/community/portal",
        issuesUrl: "https://github.com/community/portal/issues",
        templateMode: "fork",
      },
    },
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const config = await loadConfigObject({ root, deploymentSlug: "app.bringa.io" });

  assert.equal(config.app.name, "Community Portal");
  assert.deepEqual(config.app.locales, ["de"]);
  assert.equal(config.app.shortName, "base");
  assert.equal(config.branding.logoPath, "/logo.svg");
  assert.equal(config.branding.iconPath, "/icon.svg");
  assert.equal(config.repository.templateMode, "fork");
  assert.equal(config.$schema, undefined);
});

test("builds generated public content from default and deployment content profiles", async (t) => {
  const root = await createConfigProject({
    deploymentContent: {
      "legal/en.md": "# Deployment Terms\n",
    },
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const artifacts = await buildConfigArtifacts({ root, deploymentSlug: "app.bringa.io" });
  const config = JSON.parse(artifacts.configJson);

  assert.equal(config.legal.termsContentPath, "/content/generated/legal/en.md");
  assert.equal(config.content.issuePromptPath, "/content/generated/issues/en.md");
  assert.deepEqual(artifacts.contentFiles.map((file) => file.publicPath).sort(), [
    "/content/generated/legal/en.md",
    "/content/generated/onboarding/en.md",
  ]);
  assert.equal(
    artifacts.contentFiles.find((file) => file.publicPath === "/content/generated/legal/en.md")?.content,
    "# Deployment Terms\n",
  );
  assert.equal(
    artifacts.contentFiles.find((file) => file.publicPath === "/content/generated/onboarding/en.md")?.content,
    "# Default Onboarding\n",
  );
});

test("applies local overrides only when explicitly enabled", async (t) => {
  const root = await createConfigProject({
    deployment: {
      app: {
        name: "Deployed Portal",
      },
    },
    local: {
      app: {
        name: "Local Portal",
      },
      legal: {
        termsContentPath: "/content/local/legal/en.md",
      },
    },
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const defaultConfig = await loadConfigObject({ root, deploymentSlug: "app.bringa.io" });
  const localConfig = await loadConfigObject({
    root,
    deploymentSlug: "app.bringa.io",
    includeLocalConfig: true,
  });

  assert.equal(defaultConfig.app.name, "Deployed Portal");
  assert.equal(defaultConfig.legal.termsContentPath, "/content/generated/legal/en.md");
  assert.equal(localConfig.app.name, "Local Portal");
  assert.equal(localConfig.legal.termsContentPath, "/content/local/legal/en.md");
});

test("rejects unsafe deployment profile names", () => {
  assert.throws(() => resolveDeploymentSlug({ BRINGA_DEPLOYMENT: "../secret" }), {
    message: /BRINGA_DEPLOYMENT/,
  });
});
