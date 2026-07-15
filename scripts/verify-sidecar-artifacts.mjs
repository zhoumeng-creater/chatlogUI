import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_MANIFEST_PATH = join("scripts", "release", "sidecar-artifacts.json");

const TARGET_BINARY_NAMES = new Map([
  ["x86_64-pc-windows-msvc", "chatlog_alpha-x86_64-pc-windows-msvc.exe"],
  ["x86_64-apple-darwin", "chatlog_alpha-x86_64-apple-darwin"],
  ["aarch64-apple-darwin", "chatlog_alpha-aarch64-apple-darwin"],
  ["x86_64-unknown-linux-gnu", "chatlog_alpha-x86_64-unknown-linux-gnu"],
  ["aarch64-unknown-linux-gnu", "chatlog_alpha-aarch64-unknown-linux-gnu"],
]);

export async function verifySidecarArtifacts({
  rootDir = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH,
  mode = "check",
  target,
  stageDir,
  fetchBinary,
} = {}) {
  const errors = [];
  const warnings = [];
  const entries = [];

  const normalizedMode = mode === "release" ? "release" : "check";
  const manifest = await readJson(join(rootDir, manifestPath), errors);
  if (!manifest) {
    return { ok: false, errors, warnings, entries };
  }

  if (manifest.schemaVersion !== 1) {
    errors.push(`${manifestPath}: schemaVersion must be 1`);
  }
  if (manifest.sidecarName !== "chatlog_alpha") {
    errors.push(`${manifestPath}: sidecarName must be chatlog_alpha`);
  }
  if (!Array.isArray(manifest.targets)) {
    errors.push(`${manifestPath}: targets must be an array`);
    return { ok: false, errors, warnings, entries };
  }

  const targets = target
    ? manifest.targets.filter((entry) => stringValue(entry?.target) === target)
    : manifest.targets;
  if (target && targets.length === 0) {
    errors.push(`${manifestPath}: target ${target} is not declared`);
  }

  for (const entry of targets) {
    const evidence = await verifyTarget(rootDir, entry, normalizedMode, errors, warnings, {
      stageDir,
      fetchBinary,
    });
    entries.push(evidence);
  }

  return { ok: errors.length === 0, errors, warnings, entries };
}

async function verifyTarget(rootDir, entry, mode, errors, warnings, options = {}) {
  const target = stringValue(entry?.target);
  const binaryName = stringValue(entry?.binaryName);
  const expectedBinaryName = TARGET_BINARY_NAMES.get(target);
  const releaseAllowed = entry?.releaseAllowed === true;
  const checkModeAllowed = entry?.checkModeAllowed === true;
  const sourcePath = safeRelativePath(entry?.source?.path);
  const sourceRoot = safeRelativePath(entry?.source?.root);
  const sourceRepository = stringValue(entry?.source?.repository);
  const sourceRef = stringValue(entry?.source?.ref).toLowerCase();
  const sourceReleaseAllowed = entry?.source?.releaseAllowed === true;
  let artifactPath = safeRelativePath(entry?.artifact?.path);
  const expectedSha = stringValue(entry?.artifact?.sha256).toLowerCase();
  const artifactUrl = stringValue(entry?.artifact?.url);
  const stageDir = safeRelativePath(options.stageDir);
  let stagedFromUrl = false;
  const evidence = {
    target,
    platformKey: stringValue(entry?.platformKey),
    binaryName,
    expectedBinaryName,
    version: stringValue(entry?.version),
    releaseAllowed,
    sourceKind: "missing",
    sourcePath,
    sourceRoot,
    sourceRepository,
    sourceRef,
    sourceHead: "",
    sourceRemote: "",
    sourceClean: false,
    artifactPath,
    artifactUrl,
    sha256: "",
  };

  if (!target) {
    errors.push("sidecar target entry requires target");
    return evidence;
  }
  if (!expectedBinaryName) {
    errors.push(`${target}: unsupported sidecar target`);
  }
  if (!binaryName) {
    errors.push(`${target}: binaryName is required`);
  } else if (expectedBinaryName && binaryName !== expectedBinaryName) {
    errors.push(`${target}: binaryName ${binaryName} must be ${expectedBinaryName}`);
  }

  if (entry?.source?.path && !sourcePath) {
    errors.push(`${target}: source.path must be a safe relative path`);
  }
  if (entry?.source?.root && !sourceRoot) {
    errors.push(`${target}: source.root must be a safe relative path`);
  }
  if (entry?.artifact?.path && !artifactPath) {
    errors.push(`${target}: artifact.path must be a safe relative path`);
  }
  if (options.stageDir && !stageDir) {
    errors.push(`${target}: stageDir must be a safe relative path`);
  }
  if (artifactPath && basename(artifactPath) !== binaryName) {
    errors.push(`${target}: artifact.path basename must match binaryName`);
  }

  const sourceExists = sourcePath ? await directoryExists(join(rootDir, sourcePath)) : false;
  let sourceVerified = false;
  let artifact = artifactPath ? await inspectArtifact(join(rootDir, artifactPath)) : null;
  let artifactChecksumMismatch = false;
  if (artifact?.exists) {
    evidence.sha256 = artifact.sha256;
    if (!expectedSha) {
      warnings.push(`${target}: artifact exists but manifest has no sha256`);
    } else if (artifact.sha256 !== expectedSha) {
      artifactChecksumMismatch = true;
    }
  }

  if (mode === "release" && releaseAllowed && !artifact?.exists && artifactUrl && expectedSha && stageDir && binaryName) {
    const stagedArtifactPath = safeRelativePath(join(stageDir, binaryName));
    const staged = await stageArtifactFromUrl({
      rootDir,
      artifactUrl,
      expectedSha,
      stagePath: stagedArtifactPath,
      binaryName,
      errors,
      fetchBinary: options.fetchBinary,
    });
    if (staged.ok) {
      artifactPath = staged.path;
      evidence.artifactPath = staged.path;
      artifact = await inspectArtifact(join(rootDir, staged.path));
      if (artifact?.exists) {
        evidence.sha256 = artifact.sha256;
        stagedFromUrl = true;
      }
    }
  }

  if (mode === "release") {
    if (artifactChecksumMismatch) {
      errors.push(`${target}: checksum mismatch for ${artifactPath}`);
    }
    if (!releaseAllowed) {
      errors.push(`${target}: target is not allowed for release`);
      return evidence;
    }
    if (sourceReleaseAllowed) {
      sourceVerified = await verifyReleaseSourceCheckout({
        rootDir,
        target,
        source: entry?.source,
        sourcePath,
        sourceRoot,
        sourceRepository,
        sourceRef,
        evidence,
        errors,
      });
    }
    if (sourceExists && sourceReleaseAllowed && sourceVerified) {
      evidence.sourceKind = "source";
      return evidence;
    }
    if (artifact?.exists && expectedSha && artifact.sha256 === expectedSha) {
      evidence.sourceKind = stagedFromUrl ? "artifact-url" : "artifact";
      return evidence;
    }
    if (artifact?.exists && !expectedSha) {
      errors.push(`${target}: release artifact requires sha256 in manifest`);
    }
    if (artifactUrl && expectedSha && !stageDir) {
      errors.push(`${target}: artifact.url is declared but download verification is not staged locally`);
    }
    errors.push(`${target}: release needs approved source path or checksum-verified artifact`);
    return evidence;
  }

  if (sourceExists) {
    evidence.sourceKind = "source";
    return evidence;
  }
  if (artifact?.exists && (!expectedSha || artifact.sha256 === expectedSha)) {
    evidence.sourceKind = "artifact";
    return evidence;
  }
  if (checkModeAllowed) {
    evidence.sourceKind = "check-placeholder";
    warnings.push(`${target}: check-mode placeholder is allowed; this is not release evidence`);
    return evidence;
  }
  if (artifactChecksumMismatch) {
    errors.push(`${target}: checksum mismatch for ${artifactPath}`);
  }

  errors.push(`${target}: check mode needs source, artifact, or checkModeAllowed=true`);
  return evidence;
}

async function verifyReleaseSourceCheckout({
  rootDir,
  target,
  source,
  sourcePath,
  sourceRoot,
  sourceRepository,
  sourceRef,
  evidence,
  errors,
}) {
  const initialErrorCount = errors.length;
  if (stringValue(source?.type) !== "repo") {
    errors.push(`${target}: release source.type must be repo`);
  }
  if (!sourcePath) errors.push(`${target}: source.path is required for release source provenance`);
  if (!sourceRoot) errors.push(`${target}: source.root is required for release source provenance`);
  if (!sourceRepository) {
    errors.push(`${target}: source.repository is required for release source provenance`);
  }
  if (!sourceRef) {
    errors.push(`${target}: source.ref is required for release source provenance`);
  } else if (!/^[0-9a-f]{40}$/.test(sourceRef)) {
    errors.push(`${target}: source.ref must be a full 40-character Git commit`);
  }
  if (!sourcePath || !sourceRoot) return false;

  const packageRoot = join(rootDir, sourcePath);
  const checkoutRoot = join(rootDir, sourceRoot);
  if (!(await directoryExists(packageRoot))) {
    errors.push(`${target}: source.path does not exist`);
  }
  if (!(await directoryExists(checkoutRoot))) {
    errors.push(`${target}: source.root is not the Git checkout root (not a Git checkout)`);
    return false;
  }
  if (!(await fileExists(join(packageRoot, "go.mod")))) {
    errors.push(`${target}: release source root package requires go.mod`);
  }
  if (!(await fileExists(join(packageRoot, "main.go")))) {
    errors.push(`${target}: release source root package requires main.go`);
  }

  const topLevel = runGit(checkoutRoot, ["rev-parse", "--show-toplevel"]);
  if (!topLevel.ok) {
    errors.push(`${target}: source.root is not the Git checkout root (not a Git checkout)`);
    return false;
  }
  if (canonicalPath(topLevel.stdout) !== canonicalPath(checkoutRoot)) {
    errors.push(`${target}: source.root is not the Git checkout root`);
  }
  if (canonicalPath(packageRoot) !== canonicalPath(checkoutRoot)) {
    errors.push(`${target}: source.path must equal source.root for the authenticated root package`);
  }

  const head = runGit(checkoutRoot, ["rev-parse", "HEAD"]);
  if (!head.ok) {
    errors.push(`${target}: unable to resolve release source HEAD`);
  } else {
    evidence.sourceHead = head.stdout.toLowerCase();
    if (sourceRef && evidence.sourceHead !== sourceRef) {
      errors.push(`${target}: release source HEAD does not match source.ref`);
    }
  }

  const origin = runGit(checkoutRoot, ["remote", "get-url", "origin"]);
  if (!origin.ok) {
    errors.push(`${target}: release source origin does not match source.repository`);
  } else {
    evidence.sourceRemote = sanitizeRepository(origin.stdout);
    if (
      sourceRepository &&
      normalizeRepository(origin.stdout) !== normalizeRepository(sourceRepository)
    ) {
      errors.push(`${target}: release source origin does not match source.repository`);
    }
  }

  const status = runGit(checkoutRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (!status.ok) {
    errors.push(`${target}: unable to inspect release source working tree`);
  } else if (status.stdout) {
    errors.push(`${target}: release source working tree is not clean`);
  } else {
    evidence.sourceClean = true;
  }

  return errors.length === initialErrorCount;
}

async function stageArtifactFromUrl({
  rootDir,
  artifactUrl,
  expectedSha,
  stagePath,
  binaryName,
  errors,
  fetchBinary,
}) {
  let parsed;
  try {
    parsed = new URL(artifactUrl);
  } catch {
    errors.push(`${binaryName}: artifact.url must be a valid HTTPS URL`);
    return { ok: false, path: stagePath };
  }
  if (parsed.protocol !== "https:") {
    errors.push(`${binaryName}: artifact.url must use HTTPS`);
    return { ok: false, path: stagePath };
  }

  const urlArtifactName = basename(decodeURIComponent(parsed.pathname));
  if (urlArtifactName !== binaryName) {
    errors.push(`${binaryName}: artifact.url basename must match binaryName`);
    return { ok: false, path: stagePath };
  }

  let payload;
  try {
    payload = fetchBinary ? await fetchBinary(artifactUrl) : await defaultFetchBinary(artifactUrl);
  } catch (error) {
    errors.push(`${binaryName}: failed to download artifact.url: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, path: stagePath };
  }

  const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  if (buffer.length <= 0) {
    errors.push(`${binaryName}: downloaded artifact is empty`);
    return { ok: false, path: stagePath };
  }

  const actualSha = sha256Buffer(buffer);
  if (actualSha !== expectedSha) {
    errors.push(`${binaryName}: downloaded artifact checksum mismatch`);
    return { ok: false, path: stagePath };
  }

  const fullPath = join(rootDir, stagePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return { ok: true, path: stagePath };
}

async function defaultFetchBinary(url) {
  if (typeof fetch !== "function") {
    throw new Error("global fetch is unavailable");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function safeRelativePath(value) {
  const path = stringValue(value);
  if (!path) return "";
  if (isAbsolute(path)) return "";
  const normalized = normalize(path).replaceAll("\\", "/");
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) return "";
  return normalized;
}

async function directoryExists(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    ok: !result.error && result.status === 0,
    stdout: typeof result.stdout === "string" ? result.stdout.trim() : "",
  };
}

function canonicalPath(path) {
  const value = resolve(path).replaceAll("\\", "/");
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function normalizeRepository(value) {
  const repository = stringValue(value);
  if (!repository) return "";
  const scpMatch = repository.match(/^git@([^:]+):(.+)$/i);
  if (scpMatch) {
    return `${scpMatch[1]}/${scpMatch[2]}`.replace(/\.git$/i, "").replace(/\/$/, "").toLowerCase();
  }
  try {
    const parsed = new URL(repository);
    return `${parsed.hostname}${parsed.pathname}`
      .replace(/\.git$/i, "")
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return repository.replace(/\.git$/i, "").replace(/\/$/, "").toLowerCase();
  }
}

function sanitizeRepository(value) {
  const repository = stringValue(value);
  if (!repository) return "";
  try {
    const parsed = new URL(repository);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString().replace(/\/$/, "").replace(/\.git$/i, "");
  } catch {
    return repository.replace(/\.git$/i, "").replace(/\/$/, "");
  }
}

async function inspectArtifact(path) {
  try {
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size <= 0) {
      return { exists: false, sha256: "" };
    }
    return { exists: true, sha256: await sha256File(path) };
  } catch {
    return { exists: false, sha256: "" };
  }
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

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
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
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") options.mode = argv[++index];
    else if (arg === "--target") options.target = argv[++index];
    else if (arg === "--manifest") options.manifestPath = argv[++index];
    else if (arg === "--stage-dir") options.stageDir = argv[++index];
    else if (arg === "--json") options.json = true;
  }
  return options;
}

async function main() {
  const { json, ...options } = parseArgs(process.argv.slice(2));
  const result = await verifySidecarArtifacts(options);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } else if (result.ok) {
    console.log(`Sidecar artifact verification passed for ${options.mode ?? "check"} mode.`);
    for (const entry of result.entries) {
      console.log(`- ${entry.target}: ${entry.sourceKind} ${entry.binaryName}${entry.sha256 ? ` sha256=${entry.sha256}` : ""}`);
    }
    for (const warning of result.warnings) {
      console.warn(`::warning::${warning}`);
    }
  } else {
    console.error("Sidecar artifact verification failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    for (const warning of result.warnings) {
      console.warn(`::warning::${warning}`);
    }
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : "";
if (currentFile === invokedFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
