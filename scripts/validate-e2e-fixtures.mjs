import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FIXTURE_ROOT = join("e2e", "fixtures");
const MANIFEST_PATH = join(FIXTURE_ROOT, "fixture-manifest.json");
const ROUTE_MAP_PATH = join("e2e", "mock-chatlog-server", "route-map.json");

const SECRET_PATTERNS = [
  {
    label: "OpenAI-style secret",
    pattern: /\bsk-(?!synthetic-)[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    label: "Bearer token",
    pattern: /\bBearer\s+(?!synthetic-)[A-Za-z0-9._-]{20,}\b/g,
  },
  {
    label: "raw dataKey",
    pattern: /\bdataKey\s*[:=]\s*(?!synthetic|[*])[^,\s"'}]+/gi,
  },
  {
    label: "raw data_key",
    pattern: /\bdata_key\s*[:=]\s*(?!synthetic|[*])[^,\s"'}]+/gi,
  },
  {
    label: "non-synthetic Windows user path",
    pattern: /C:\\Users\\(?!Synthetic\\)[^"'\\]+(?:\\[^"']*)?/g,
  },
  {
    label: "non-synthetic WeChat profile path",
    pattern: /WeChat Files\\(?!wxid_synthetic|Synthetic)[^"'\\]+/g,
  },
  {
    label: "SNS proxy query",
    pattern: /\/api\/v1\/sns\/media\/proxy\?[^"'\s]+/g,
  },
];

export async function validateFixtureWorkspace(rootDir = process.cwd()) {
  const errors = [];
  const warnings = [];
  const routes = [];

  const manifest = await readJson(join(rootDir, MANIFEST_PATH), errors);
  const routeMap = await readJson(join(rootDir, ROUTE_MAP_PATH), errors);
  if (!manifest || !routeMap) {
    return { ok: false, errors, warnings, routes };
  }

  if (manifest.synthetic !== true) {
    errors.push(`${MANIFEST_PATH}: synthetic must be true`);
  }
  if (routeMap.synthetic !== true) {
    errors.push(`${ROUTE_MAP_PATH}: synthetic must be true`);
  }

  const fixtureById = await loadFixtures(rootDir, manifest, errors);
  const manifestRoutes = [];
  validateRouteStates("manifest.routeStates", manifest.routeStates, fixtureById, errors, manifestRoutes);
  validateRouteStates("routeMap.routes", routeMap.routes, fixtureById, errors, routes);
  validateAdvancedFamilyCoverage(manifest, manifestRoutes, errors);
  validateUniqueRouteIds(routes, errors);

  for (const [fixtureId, fixture] of fixtureById) {
    scanValue(fixture.value, `fixture:${fixtureId}`, errors);
  }
  scanValue(manifest, "fixture-manifest", errors);
  scanValue(routeMap, "route-map", errors);

  return { ok: errors.length === 0, errors, warnings, routes };
}

async function loadFixtures(rootDir, manifest, errors) {
  const fixtureById = new Map();
  if (!Array.isArray(manifest.fixtures)) {
    errors.push(`${MANIFEST_PATH}: fixtures must be an array`);
    return fixtureById;
  }

  for (const fixture of manifest.fixtures) {
    if (!fixture || typeof fixture !== "object") {
      errors.push(`${MANIFEST_PATH}: fixture entry must be an object`);
      continue;
    }
    const id = stringValue(fixture.id);
    const path = stringValue(fixture.path);
    if (!id || !path) {
      errors.push(`${MANIFEST_PATH}: fixture entry requires id and path`);
      continue;
    }
    if (path.includes("..") || normalize(path) !== path) {
      errors.push(`${MANIFEST_PATH}: fixture ${id} has unsafe path ${path}`);
      continue;
    }
    const fullPath = join(rootDir, FIXTURE_ROOT, path);
    const value = await readJson(fullPath, errors);
    if (!value) continue;
    if (value.synthetic !== true) {
      errors.push(`${join(FIXTURE_ROOT, path)}: synthetic must be true`);
    }
    fixtureById.set(id, { path, value });
  }

  return fixtureById;
}

function validateRouteStates(label, routeStates, fixtureById, errors, routes) {
  if (!Array.isArray(routeStates)) {
    errors.push(`${label}: must be an array`);
    return;
  }

  for (const route of routeStates) {
    if (!route || typeof route !== "object") {
      errors.push(`${label}: route entry must be an object`);
      continue;
    }
    const id = stringValue(route.id);
    const fixtureId = stringValue(route.fixture);
    const section = stringValue(route.section);
    const method = stringValue(route.method);
    const path = stringValue(route.path);
    if (!id || !fixtureId || !section || !method || !path) {
      errors.push(`${label}: route entry requires id, fixture, section, method, and path`);
      continue;
    }

    const fixture = fixtureById.get(fixtureId);
    if (!fixture) {
      errors.push(`${label}.${id}: unknown fixture ${fixtureId}`);
      continue;
    }
    const resolved = resolveSection(fixture.value, section);
    if (!resolved.found) {
      errors.push(`${label}.${id}: section ${section} was not found in fixture ${fixtureId}`);
      continue;
    }
    validateRouteContractShape(`${label}.${id}`, { method, path }, resolved.value, errors);
    routes.push({
      id,
      fixture: fixtureId,
      section,
      method: method.toUpperCase(),
      path,
      family: stringValue(route.family),
      state: stringValue(route.state).toLowerCase(),
    });
  }
}

function validateAdvancedFamilyCoverage(manifest, routes, errors) {
  const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
  for (const fixture of fixtures) {
    const fixtureId = stringValue(fixture?.id);
    if (!fixtureId.startsWith("advanced")) continue;

    const families = Array.isArray(fixture.routeFamilies)
      ? fixture.routeFamilies.map(stringValue).filter(Boolean)
      : [];
    for (const family of families) {
      const familyRoutes = routes.filter((route) => route.fixture === fixtureId && route.family === family);
      if (!familyRoutes.some((route) => route.state === "success")) {
        errors.push(`advanced family ${family} needs at least one success state`);
      }
      if (!familyRoutes.some((route) => route.state === "edge" || route.state === "failure")) {
        errors.push(`advanced family ${family} needs at least one edge or failure state`);
      }
    }
  }
}

function validateRouteContractShape(label, route, value, errors) {
  const method = route.method.toUpperCase();
  if (method === "GET" && route.path === "/api/v1/db/tables") {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
      errors.push(`${label}: /api/v1/db/tables must resolve to an array of table names`);
    }
  }
}

function validateUniqueRouteIds(routes, errors) {
  const seen = new Set();
  for (const route of routes) {
    const key = `${route.method} ${route.path} ${route.id}`;
    if (seen.has(key)) {
      errors.push(`duplicate route id/path entry: ${key}`);
    }
    seen.add(key);
  }
}

export function resolveSection(value, section) {
  const parts = section.split(".");
  let current = value;
  for (const part of parts) {
    if (
      current &&
      typeof current === "object" &&
      Object.prototype.hasOwnProperty.call(current, part)
    ) {
      current = current[part];
      continue;
    }
    return { found: false, value: undefined };
  }
  return { found: true, value: current };
}

function scanValue(value, path, errors) {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    for (const rule of SECRET_PATTERNS) {
      const matches = [...value.matchAll(rule.pattern)];
      for (const match of matches) {
        if (isAllowedSyntheticSensitiveValue(value, path)) continue;
        errors.push(`${path}: ${rule.label} matched "${match[0]}"`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, errors));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      scanValue(child, `${path}.${key}`, errors);
    }
  }
}

function isAllowedSyntheticSensitiveValue(value, path) {
  if (!value.toLowerCase().includes("synthetic")) return false;
  if (path.includes("redactionCases")) return true;
  if (path.includes("expectedExport.mustNotContain")) return true;
  return false;
}

async function readJson(path, errors) {
  if (!existsSync(path)) {
    errors.push(`${path}: file not found`);
    return null;
  }
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

async function main() {
  const rootDir = process.argv[2] ? join(process.cwd(), process.argv[2]) : process.cwd();
  const result = await validateFixtureWorkspace(rootDir);
  if (result.ok) {
    console.log(`Fixture validation passed: ${result.routes.length} route entries checked.`);
    return;
  }

  console.error("Fixture validation failed:");
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
