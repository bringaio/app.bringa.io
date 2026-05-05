import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDeploymentSlug = "app.bringa.io";

function getOutputs(root) {
  return [
    path.join(root, "public", "bringa.config.json"),
    path.join(root, "src", "config", "bringa.config.generated.json"),
  ];
}

export function stripComments(input) {
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

export function removeTrailingCommas(input) {
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

function assertPublicPath(value, pathName) {
  assertString(value, pathName);

  if (!value.startsWith("/")) {
    throw new Error(`Expected ${pathName} to be an absolute public path starting with "/".`);
  }

  if (value === "/" || value.endsWith("/")) {
    throw new Error(`Expected ${pathName} to point to a public file.`);
  }

  if (value.includes("\\") || value.split("/").includes("..")) {
    throw new Error(`Expected ${pathName} to stay within the public directory.`);
  }
}

function assertPublicDirectoryPath(value, pathName) {
  assertString(value, pathName);

  if (!value.startsWith("/")) {
    throw new Error(`Expected ${pathName} to be an absolute public path starting with "/".`);
  }

  if (value === "/" || value.endsWith("/")) {
    throw new Error(`Expected ${pathName} to point to a public directory without a trailing slash.`);
  }

  if (value.includes("\\") || value.split("/").includes("..")) {
    throw new Error(`Expected ${pathName} to stay within the public directory.`);
  }
}

function assertRelativeContentPath(value, pathName) {
  assertString(value, pathName);

  if (value.startsWith("/") || value.includes("\\") || value.split("/").includes("..")) {
    throw new Error(`Expected ${pathName} to be a relative repository content path.`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function mergeConfigLayers(base, override) {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (key === "$schema") {
      continue;
    }

    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeConfigLayers(merged[key], value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export function resolveDeploymentSlug(env = process.env) {
  const slug = env.BRINGA_DEPLOYMENT?.trim() || defaultDeploymentSlug;

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) {
    throw new Error(
      "Expected BRINGA_DEPLOYMENT to contain only letters, numbers, dots, underscores, or hyphens.",
    );
  }

  return slug;
}

function resolveIncludeLocalConfig(env = process.env) {
  const flag = env.BRINGA_CONFIG_INCLUDE_LOCAL?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function getConfigLayerPaths(root, deploymentSlug) {
  return {
    base: path.join(root, "config", "base.config.jsonc"),
    deployment: path.join(root, "config", "deployments", `${deploymentSlug}.jsonc`),
    local: path.join(root, "config", "local.config.jsonc"),
  };
}

async function readConfigLayer(filePath, label, { optional = false } = {}) {
  let source;

  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    if (optional && error?.code === "ENOENT") {
      return {};
    }
    throw new Error(`Missing ${label} config layer: ${filePath}`);
  }

  const parsed = JSON.parse(removeTrailingCommas(stripComments(source)));

  if (!isPlainObject(parsed)) {
    throw new Error(`Expected ${label} config layer to contain a JSON object.`);
  }

  return parsed;
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
  assertPublicPath(config.branding?.logoPath, "branding.logoPath");
  assertPublicPath(config.branding?.iconPath, "branding.iconPath");
  assertPublicPath(config.branding?.pwaIcon192Path, "branding.pwaIcon192Path");
  assertPublicPath(config.branding?.pwaIcon512Path, "branding.pwaIcon512Path");
  assertPublicPath(config.branding?.maskableIcon512Path, "branding.maskableIcon512Path");
  assertPublicPath(config.branding?.appleTouchIconPath, "branding.appleTouchIconPath");
  assertString(config.branding?.themeColor, "branding.themeColor");
  assertString(config.branding?.backgroundColor, "branding.backgroundColor");
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
  assertRelativeContentPath(config.content?.sourcePath, "content.sourcePath");
  assertRelativeContentPath(config.content?.deploymentPath, "content.deploymentPath");
  assertPublicDirectoryPath(config.content?.publicPath, "content.publicPath");
  assertPublicPath(config.content?.issuePromptPath, "content.issuePromptPath");
  assertStringArray(config.content?.requiredFiles, "content.requiredFiles");
  for (const [index, requiredFile] of config.content.requiredFiles.entries()) {
    assertRelativeContentPath(requiredFile, `content.requiredFiles[${index}]`);
  }
  assertString(config.legal?.termsPath, "legal.termsPath");
  assertPublicPath(config.legal?.termsContentPath, "legal.termsContentPath");
  assertString(config.legal?.contentContributionLabel, "legal.contentContributionLabel");
  assertString(config.legal?.itemGiftLabel, "legal.itemGiftLabel");
  assertBoolean(config.legal?.publicDomainIntent, "legal.publicDomainIntent");
  assertString(config.supabase?.url, "supabase.url");
  assertString(config.supabase?.publishableKey, "supabase.publishableKey");
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

async function assertPublicFileExists(root, publicPath, pathName) {
  const publicRoot = path.join(root, "public");
  const filePath = path.resolve(publicRoot, publicPath.slice(1));

  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error(`Expected ${pathName} to stay within the public directory.`);
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error("not a file");
    }
  } catch {
    throw new Error(`Expected ${pathName} to point to an existing public file: ${publicPath}`);
  }
}

async function validateReferencedPublicFiles(root, config, { skipLegalContent = false } = {}) {
  const files = [
    assertPublicFileExists(root, config.branding.logoPath, "branding.logoPath"),
    assertPublicFileExists(root, config.branding.iconPath, "branding.iconPath"),
    assertPublicFileExists(root, config.branding.pwaIcon192Path, "branding.pwaIcon192Path"),
    assertPublicFileExists(root, config.branding.pwaIcon512Path, "branding.pwaIcon512Path"),
    assertPublicFileExists(root, config.branding.maskableIcon512Path, "branding.maskableIcon512Path"),
    assertPublicFileExists(root, config.branding.appleTouchIconPath, "branding.appleTouchIconPath"),
  ];

  if (!skipLegalContent) {
    files.push(assertPublicFileExists(root, config.legal.termsContentPath, "legal.termsContentPath"));
    files.push(assertPublicFileExists(root, config.content.issuePromptPath, "content.issuePromptPath"));
  }

  await Promise.all(files);
}

function resolveRepoPath(root, relativePath, pathName) {
  assertRelativeContentPath(relativePath, pathName);

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Expected ${pathName} to stay within the repository.`);
  }

  return resolvedPath;
}

async function collectContentFiles(rootDir, prefix = "") {
  let entries;

  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return new Map();
    }
    throw error;
  }

  const files = new Map();

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectContentFiles(entryPath, relativePath);
      for (const [nestedPath, content] of nested.entries()) {
        files.set(nestedPath, content);
      }
      continue;
    }

    if (entry.isFile()) {
      files.set(relativePath, await readFile(entryPath, "utf8"));
    }
  }

  return files;
}

function contentPublicPath(config, relativePath) {
  assertRelativeContentPath(relativePath, "content file path");
  return `${config.content.publicPath}/${relativePath}`;
}

export async function buildContentFiles(root, deploymentSlug, config) {
  const defaultContentRoot = resolveRepoPath(root, config.content.sourcePath, "content.sourcePath");
  const deploymentContentRoot = path.join(
    resolveRepoPath(root, config.content.deploymentPath, "content.deploymentPath"),
    deploymentSlug,
  );
  const files = await collectContentFiles(defaultContentRoot);
  const deploymentFiles = await collectContentFiles(deploymentContentRoot);

  for (const [relativePath, content] of deploymentFiles.entries()) {
    files.set(relativePath, content);
  }

  for (const requiredFile of config.content.requiredFiles) {
    if (!files.has(requiredFile)) {
      throw new Error(`Missing required content file: ${requiredFile}`);
    }
  }

  return [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, content]) => ({
      relativePath,
      publicPath: contentPublicPath(config, relativePath),
      outputPath: path.resolve(root, "public", contentPublicPath(config, relativePath).slice(1)),
      content,
    }));
}

async function assertGeneratedFileCurrent(root, outputPath, expectedContent) {
  let current;

  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    throw new Error(`${path.relative(root, outputPath)} is out of date. Run pnpm generate:config.`);
  }

  if (current !== expectedContent) {
    throw new Error(`${path.relative(root, outputPath)} is out of date. Run pnpm generate:config.`);
  }
}

async function writeGeneratedFile(outputPath, content) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
}

async function syncGeneratedContent(root, contentFiles, checkOnly) {
  for (const file of contentFiles) {
    if (checkOnly) {
      await assertGeneratedFileCurrent(root, file.outputPath, file.content);
      continue;
    }

    await writeGeneratedFile(file.outputPath, file.content);
  }
}

export async function buildConfigArtifacts(options = {}) {
  const root = options.root ?? defaultRoot;
  const deploymentSlug = options.deploymentSlug ?? resolveDeploymentSlug();
  const includeLocalConfig = options.includeLocalConfig ?? resolveIncludeLocalConfig();
  const config = await loadConfigObject({
    root,
    deploymentSlug,
    includeLocalConfig,
    validatePublicFiles: false,
  });
  const contentFiles = await buildContentFiles(root, deploymentSlug, config);

  await validateReferencedPublicFiles(root, config, { skipLegalContent: true });

  return {
    configJson: `${JSON.stringify(config, null, 2)}\n`,
    contentFiles,
  };
}

async function validateReferencedGeneratedFiles(root, config) {
  await Promise.all([
    assertPublicFileExists(root, config.legal.termsContentPath, "legal.termsContentPath"),
    assertPublicFileExists(root, config.content.issuePromptPath, "content.issuePromptPath"),
  ]);
}

export async function loadConfigObject({
  root = defaultRoot,
  deploymentSlug = resolveDeploymentSlug(),
  includeLocalConfig = resolveIncludeLocalConfig(),
  validatePublicFiles = true,
} = {}) {
  const paths = getConfigLayerPaths(root, deploymentSlug);
  const layers = [
    await readConfigLayer(paths.base, "base"),
    await readConfigLayer(paths.deployment, `deployment "${deploymentSlug}"`),
  ];

  if (includeLocalConfig) {
    layers.push(await readConfigLayer(paths.local, "local", { optional: true }));
  }

  const config = layers.reduce((merged, layer) => mergeConfigLayers(merged, layer), {});
  validateConfig(config);
  if (validatePublicFiles) {
    await validateReferencedPublicFiles(root, config);
  }
  return config;
}

export async function buildConfigJson(options = {}) {
  const config = await loadConfigObject(options);
  return `${JSON.stringify(config, null, 2)}\n`;
}

async function main() {
  const root = defaultRoot;
  const artifacts = await buildConfigArtifacts({
    root,
    deploymentSlug: resolveDeploymentSlug(),
    includeLocalConfig: resolveIncludeLocalConfig(),
  });
  const checkOnly = process.argv.includes("--check");

  for (const outputPath of getOutputs(root)) {
    if (checkOnly) {
      const current = await readFile(outputPath, "utf8");
      if (current !== artifacts.configJson) {
        throw new Error(`${path.relative(root, outputPath)} is out of date. Run pnpm generate:config.`);
      }
      continue;
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, artifacts.configJson);
  }

  await syncGeneratedContent(root, artifacts.contentFiles, checkOnly);
  await validateReferencedGeneratedFiles(root, JSON.parse(artifacts.configJson));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
