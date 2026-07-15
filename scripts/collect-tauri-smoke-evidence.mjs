import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, normalize, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_BUNDLE_ROOT = join("src-tauri", "target", "release", "bundle");

const ARTIFACT_KIND_ORDER = {
  msi: 0,
  nsis: 1,
};

const FORBIDDEN_SMOKE_TEXT_RULES = [
  {
    label: "raw data key",
    pattern: /["']?\bdata(?:[_\-\s]?key|key)["']?\s*[:=]\s*["']?(?!\[redacted\]|\*+)[^"',}\s]+/i,
  },
  {
    label: "raw api key",
    pattern: /["']?\bapi(?:[_\-\s]?key|key)["']?\s*[:=]\s*["']?(?!\[redacted\]|\*+)[^"',}\s]+/i,
  },
  {
    label: "raw token",
    pattern: /(?:["']?\b(?:token|authorization)["']?\s*[:=]\s*["']?(?!\[redacted\]|\*+)(?:bearer\s+)?[^"',}\s]+|\bbearer\s+(?!\[redacted\]|\*+)[^"',}\s]+)/i,
  },
  {
    label: "raw secret",
    pattern: /["']?\b(?:secret|credential|password)["']?\s*[:=]\s*["']?(?!\[redacted\]|\*+)[^"',}\s]+/i,
  },
  {
    label: "Windows user path",
    pattern: /[A-Za-z]:[\\/]+Users[\\/]+[^"'\r\n]+/i,
  },
  {
    label: "absolute Windows path",
    pattern: /[A-Za-z]:[\\/]+(?!Users[\\/])[^"'\r\n]+/i,
  },
  {
    label: "WeChat profile id",
    pattern: /\bwxid_[A-Za-z0-9_-]+\b/i,
  },
  {
    label: "private message marker",
    pattern: /\bprivate message\b/i,
  },
  {
    label: "private content marker",
    pattern: /(?:"(?:content|message|messageBody|chatContent|keyword|query|requestBody|responseBody|rawResponse)"\s*:\s*"(?!\[redacted\]|\*+)[^"]+"|synthetic-private-message)/i,
  },
  {
    label: "WeChat profile path",
    pattern: /WeChat Files[\\/]+[^"'\r\n]+/i,
  },
];

export async function collectInstallerArtifacts({
  rootDir = process.cwd(),
  bundleRoot = DEFAULT_BUNDLE_ROOT,
} = {}) {
  const errors = [];
  const warnings = [];
  const artifacts = [];
  const safeBundleRoot = safeRelativePath(bundleRoot);

  if (!safeBundleRoot) {
    errors.push("bundleRoot must be a safe relative path");
    return { ok: false, errors, warnings, artifacts };
  }

  const fullBundleRoot = join(rootDir, safeBundleRoot);
  if (!existsSync(fullBundleRoot)) {
    errors.push(`${safeBundleRoot}: bundle root does not exist`);
    return { ok: false, errors, warnings, artifacts };
  }

  await collectArtifacts(rootDir, fullBundleRoot, artifacts);
  artifacts.sort((left, right) => {
    const kindDelta = ARTIFACT_KIND_ORDER[left.kind] - ARTIFACT_KIND_ORDER[right.kind];
    if (kindDelta !== 0) return kindDelta;
    return left.path.localeCompare(right.path);
  });

  if (artifacts.length === 0) {
    errors.push(`${safeBundleRoot}: no Windows MSI or NSIS installer artifacts found`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    artifacts,
  };
}

export function scanForbiddenSmokeText(text) {
  const findings = [];
  const lines = String(text ?? "").split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const rule of FORBIDDEN_SMOKE_TEXT_RULES) {
      if (rule.pattern.test(lineText)) {
        findings.push({
          label: rule.label,
          line: index + 1,
        });
      }
    }
  });

  return findings;
}

export async function scanSmokeFile({ scanFile }) {
  if (!scanFile) {
    return {
      ok: false,
      errors: ["scanFile is required"],
      findings: [],
      file: "",
    };
  }

  if (!existsSync(scanFile)) {
    return {
      ok: false,
      errors: ["scan file was not found"],
      findings: [],
      file: basename(scanFile),
    };
  }

  let contents;
  try {
    contents = await readFile(scanFile, "utf8");
  } catch {
    return {
      ok: false,
      errors: ["scan file could not be read"],
      findings: [],
      file: basename(scanFile),
    };
  }

  const findings = scanForbiddenSmokeText(contents);
  return {
    ok: findings.length === 0,
    errors: [],
    findings,
    file: basename(scanFile),
  };
}

async function collectArtifacts(rootDir, currentDir, artifacts) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectArtifacts(rootDir, fullPath, artifacts);
      continue;
    }

    if (!entry.isFile()) continue;

    const kind = classifyInstallerArtifact(fullPath);
    if (!kind) continue;

    const metadata = await stat(fullPath);
    if (metadata.size <= 0) continue;

    artifacts.push({
      kind,
      path: relativePath(rootDir, fullPath),
      name: basename(fullPath),
      bytes: metadata.size,
      sha256: await sha256File(fullPath),
      modifiedUtc: metadata.mtime.toISOString(),
    });
  }
}

function classifyInstallerArtifact(path) {
  const name = basename(path).toLowerCase();
  const extension = extname(name);
  if (extension === ".msi") return "msi";
  if (extension === ".exe" && name.endsWith("-setup.exe")) return "nsis";
  return "";
}

function relativePath(rootDir, fullPath) {
  return normalize(relative(rootDir, fullPath)).replaceAll("\\", "/");
}

function safeRelativePath(value) {
  const path = stringValue(value);
  if (!path || isAbsolute(path)) return "";
  const normalized = normalize(path).replaceAll("\\", "/");
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) return "";
  return normalized;
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

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--bundle-root") options.bundleRoot = argv[++index];
    else if (arg === "--scan-file") options.scanFile = argv[++index];
    else if (arg === "--json") options.json = true;
  }
  return options;
}

async function main() {
  const { json, scanFile, ...options } = parseArgs(process.argv.slice(2));
  const result = scanFile
    ? await scanSmokeFile({ scanFile })
    : await collectInstallerArtifacts(options);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } else if (result.ok) {
    if ("artifacts" in result) {
      console.log(`Installer artifact inventory passed: ${result.artifacts.length} artifacts found.`);
      for (const artifact of result.artifacts) {
        console.log(`- ${artifact.kind}: ${artifact.path} bytes=${artifact.bytes} sha256=${artifact.sha256}`);
      }
    } else {
      console.log(`Smoke text scan passed for ${result.file}.`);
    }
  } else {
    if ("findings" in result && result.findings.length > 0) {
      console.error(`Smoke text scan failed for ${result.file}:`);
      for (const finding of result.findings) {
        console.error(`- line ${finding.line}: ${finding.label}`);
      }
    } else {
      console.error("Installer smoke evidence collection failed:");
      for (const error of result.errors) {
        console.error(`- ${error}`);
      }
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
