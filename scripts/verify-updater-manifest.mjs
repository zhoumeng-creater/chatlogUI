import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function verifyUpdaterManifest({
  manifestPath,
  artifactDir,
  bundleRoot,
  requiredPlatforms = [],
} = {}) {
  const errors = [];
  const warnings = [];
  const platforms = [];
  const manifestEvidence = {
    path: "",
    sha256: "",
  };

  let resolvedManifestPath = manifestPath;
  if (!resolvedManifestPath && bundleRoot) {
    resolvedManifestPath = await findManifestPath(bundleRoot, requiredPlatforms, errors);
  }

  if (!resolvedManifestPath) {
    if (!manifestPath && !bundleRoot) {
      errors.push("manifestPath or bundleRoot is required");
    }
    return { ok: false, errors, warnings, manifest: manifestEvidence, platforms };
  }

  manifestEvidence.path = resolvedManifestPath;
  if (existsSync(resolvedManifestPath)) {
    manifestEvidence.sha256 = await sha256File(resolvedManifestPath);
  }

  const manifest = await readJson(resolvedManifestPath, errors);
  if (!manifest) {
    return { ok: false, errors, warnings, manifest: manifestEvidence, platforms };
  }

  if (!stringValue(manifest.version)) errors.push("manifest.version is required");
  if (!manifest.platforms || typeof manifest.platforms !== "object" || Array.isArray(manifest.platforms)) {
    errors.push("manifest.platforms must be an object");
    return { ok: false, errors, warnings, manifest: manifestEvidence, platforms };
  }
  if (manifest.pub_date && Number.isNaN(Date.parse(manifest.pub_date))) {
    errors.push("manifest.pub_date must be an ISO date when present");
  }

  const evidenceArtifactDir = artifactDir || (bundleRoot ? dirname(resolvedManifestPath) : "");
  const availableArtifacts = evidenceArtifactDir ? await collectArtifacts(evidenceArtifactDir, errors) : new Map();
  const requiredPlatformSet = new Set(requiredPlatforms);
  for (const platform of requiredPlatforms) {
    if (!manifest.platforms[platform]) {
      errors.push(`missing required platform ${platform}`);
    }
  }

  for (const [platform, entry] of Object.entries(manifest.platforms)) {
    const signature = stringValue(entry?.signature);
    const url = stringValue(entry?.url);
    const artifactName = artifactNameFromUrl(url);
    const artifact = artifactName ? availableArtifacts.get(artifactName) : undefined;
    const evidence = {
      platform,
      artifactName,
      artifactPath: artifact?.path ?? "",
      artifactPresent: Boolean(artifact),
      artifactSha256: artifact?.sha256 ?? "",
      signaturePresent: Boolean(signature),
      url,
    };
    platforms.push(evidence);

    if (!url) {
      errors.push(`${platform}: url is required`);
      continue;
    }
    if (!signature) {
      errors.push(`${platform}: signature must be non-empty content`);
    } else if (looksLikeSignatureFileReference(signature)) {
      errors.push(`${platform}: signature must be embedded content, not a .sig file reference`);
    }
    if (!artifactName) {
      errors.push(`${platform}: url must include an artifact file name`);
    } else if (evidenceArtifactDir && shouldRequireArtifact(platform, requiredPlatformSet) && !artifact) {
      errors.push(`${platform}: artifact ${artifactName} was not found in ${evidenceArtifactDir}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, manifest: manifestEvidence, platforms };
}

function looksLikeSignatureFileReference(value) {
  const lower = value.toLowerCase();
  return lower.endsWith(".sig") || lower.startsWith("http://") || lower.startsWith("https://") || lower.includes("/") || lower.includes("\\");
}

function artifactNameFromUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return basename(decodeURIComponent(parsed.pathname));
  } catch {
    return basename(value);
  }
}

function shouldRequireArtifact(platform, requiredPlatformSet) {
  return requiredPlatformSet.size === 0 || requiredPlatformSet.has(platform);
}

async function findManifestPath(bundleRoot, requiredPlatforms, errors) {
  const candidates = [];
  if (!existsSync(bundleRoot)) {
    errors.push(`bundleRoot ${bundleRoot} does not exist`);
    return "";
  }

  async function walk(current) {
    const items = await readdir(current, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(current, item.name);
      if (item.isDirectory()) {
        await walk(fullPath);
      } else if (item.isFile() && item.name === "latest.json") {
        candidates.push(fullPath);
      }
    }
  }

  await walk(bundleRoot);
  if (candidates.length === 0) {
    errors.push(`no latest.json was found under ${bundleRoot}`);
    return "";
  }

  if (requiredPlatforms.length === 0) {
    return candidates[0];
  }

  for (const candidate of candidates) {
    const candidateErrors = [];
    const manifest = await readJson(candidate, candidateErrors);
    if (
      manifest?.platforms &&
      requiredPlatforms.every((platform) => Boolean(manifest.platforms[platform]))
    ) {
      return candidate;
    }
  }

  errors.push(`no latest.json under ${bundleRoot} contains required platforms ${requiredPlatforms.join(",")}`);
  return "";
}

async function collectArtifacts(dir, errors) {
  const artifacts = new Map();
  if (!existsSync(dir)) {
    errors.push(`artifactDir ${dir} does not exist`);
    return artifacts;
  }

  async function walk(current) {
    const items = await readdir(current, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(current, item.name);
      if (item.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (item.isFile() && (await stat(fullPath)).size > 0) {
        if (!artifacts.has(item.name)) {
          artifacts.set(item.name, {
            path: fullPath,
            sha256: await sha256File(fullPath),
          });
        }
      }
    }
  }

  await walk(dir);
  return artifacts;
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function readJson(path, errors) {
  if (!existsSync(path)) {
    errors.push(`${path}: file not found`);
    return null;
  }
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function parseArgs(argv) {
  const options = { requiredPlatforms: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") options.manifestPath = argv[++index];
    else if (arg === "--artifact-dir") options.artifactDir = argv[++index];
    else if (arg === "--bundle-root") options.bundleRoot = argv[++index];
    else if (arg === "--json") options.json = true;
    else if (arg === "--required-platforms") {
      options.requiredPlatforms = stringValue(argv[++index])
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }
  return options;
}

async function main() {
  const { json, ...options } = parseArgs(process.argv.slice(2));
  const result = await verifyUpdaterManifest(options);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (result.ok) {
    console.log(`Updater manifest verification passed: ${result.platforms.length} platform entries checked.`);
    if (result.manifest.path) {
      console.log(`- manifest: ${result.manifest.path} sha256=${result.manifest.sha256}`);
    }
    for (const platform of result.platforms) {
      const artifactEvidence = platform.artifactSha256 ? ` sha256=${platform.artifactSha256}` : "";
      const localEvidence = platform.artifactPresent ? " local-artifact" : " manifest-only";
      console.log(`- ${platform.platform}: ${platform.artifactName}${localEvidence}${artifactEvidence}`);
    }
    return;
  }

  console.error("Updater manifest verification failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : "";
if (currentFile === invokedFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
