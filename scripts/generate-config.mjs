import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "config", "bringa.config.jsonc");
const outputs = [
  path.join(root, "public", "bringa.config.json"),
  path.join(root, "src", "config", "bringa.config.generated.json"),
];

function stripComments(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function removeTrailingCommas(input) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let cursor = index + 1;
      while (/\s/.test(input[cursor])) {
        cursor += 1;
      }
      if (input[cursor] === "}" || input[cursor] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}

function assertString(value, pathName, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`Expected ${pathName} to be a non-empty string.`);
  }
}

function assertBoolean(value, pathName) {
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${pathName} to be a boolean.`);
  }
}

function assertPositiveNumber(value, pathName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Expected ${pathName} to be a positive number.`);
  }
}

function assertStringArray(value, pathName) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw new Error(`Expected ${pathName} to be an array of non-empty strings.`);
  }
}

function validateConfig(config) {
  assertString(config.app?.name, "app.name");
  assertString(config.app?.shortName, "app.shortName");
  assertString(config.app?.description, "app.description");
  assertString(config.app?.defaultLocale, "app.defaultLocale");
  assertStringArray(config.app?.locales, "app.locales");
  assertString(config.app?.titleTemplate, "app.titleTemplate");
  assertString(config.app?.canonicalUrl, "app.canonicalUrl");
  assertString(config.app?.homeHref, "app.homeHref");
  assertString(config.branding?.logoText, "branding.logoText");
  assertString(config.branding?.bornAndHostedBy, "branding.bornAndHostedBy");
  assertString(config.operator?.organizationName, "operator.organizationName");
  assertString(config.operator?.defaultOwnerLabel, "operator.defaultOwnerLabel");
  assertString(config.operator?.contactEmail, "operator.contactEmail", { allowEmpty: true });
  assertString(config.operator?.privacyEmail, "operator.privacyEmail", { allowEmpty: true });
  assertString(config.operator?.jurisdiction, "operator.jurisdiction", { allowEmpty: true });
  assertString(config.repository?.provider, "repository.provider");
  assertString(config.repository?.owner, "repository.owner");
  assertString(config.repository?.name, "repository.name");
  assertString(config.repository?.url, "repository.url");
  assertString(config.repository?.issuesUrl, "repository.issuesUrl");
  assertString(config.repository?.discussionsUrl, "repository.discussionsUrl", { allowEmpty: true });
  assertString(config.repository?.templateMode, "repository.templateMode");
  assertString(config.legal?.termsPath, "legal.termsPath");
  assertString(config.legal?.contentContributionLabel, "legal.contentContributionLabel");
  assertString(config.legal?.itemGiftLabel, "legal.itemGiftLabel");
  assertBoolean(config.legal?.publicDomainIntent, "legal.publicDomainIntent");
  assertString(config.supabase?.url, "supabase.url", { allowEmpty: true });
  assertString(config.supabase?.publishableKey, "supabase.publishableKey", { allowEmpty: true });
  assertString(config.supabase?.authRedirectPath, "supabase.authRedirectPath");
  assertBoolean(config.invites?.allowSignupWithoutInvite, "invites.allowSignupWithoutInvite");
  assertBoolean(config.invites?.collectDisplayNameBeforeInvite, "invites.collectDisplayNameBeforeInvite");
  assertStringArray(config.media?.acceptedImageMimeTypes, "media.acceptedImageMimeTypes");
  assertPositiveNumber(config.media?.maxUploadBytes, "media.maxUploadBytes");
  assertPositiveNumber(config.media?.compressionMaxSizeMb, "media.compressionMaxSizeMb");
  assertPositiveNumber(config.media?.compressionMaxWidthOrHeight, "media.compressionMaxWidthOrHeight");
  assertBoolean(config.features?.githubLinkInTopbar, "features.githubLinkInTopbar");
  assertBoolean(config.features?.showBorrowedFirstOnlyWhenActive, "features.showBorrowedFirstOnlyWhenActive");
  assertBoolean(config.features?.telegramAdminNotifications, "features.telegramAdminNotifications");
  assertBoolean(config.features?.itemVersioning, "features.itemVersioning");
  assertBoolean(config.features?.profilePages, "features.profilePages");
}

async function loadConfig() {
  const source = await readFile(sourcePath, "utf8");
  const json = removeTrailingCommas(stripComments(source));
  const config = JSON.parse(json);
  delete config.$schema;
  validateConfig(config);
  return `${JSON.stringify(config, null, 2)}\n`;
}

async function main() {
  const generated = await loadConfig();
  const checkOnly = process.argv.includes("--check");

  for (const outputPath of outputs) {
    if (checkOnly) {
      const current = await readFile(outputPath, "utf8");
      if (current !== generated) {
        throw new Error(`${path.relative(root, outputPath)} is out of date. Run pnpm generate:config.`);
      }
      continue;
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, generated);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
