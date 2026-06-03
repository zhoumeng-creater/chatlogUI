import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveSection } from "../../scripts/validate-e2e-fixtures.mjs";

const FIXTURE_ROOT = join("e2e", "fixtures");
const MANIFEST_PATH = join(FIXTURE_ROOT, "fixture-manifest.json");
const ROUTE_MAP_PATH = join("e2e", "mock-chatlog-server", "route-map.json");

export async function loadMockRouteMap(rootDir = process.cwd()) {
  const manifest = await readJson(join(rootDir, MANIFEST_PATH));
  const routeMap = await readJson(join(rootDir, ROUTE_MAP_PATH));
  const fixtures = new Map();

  for (const fixture of manifest.fixtures ?? []) {
    fixtures.set(fixture.id, {
      meta: fixture,
      value: await readJson(join(rootDir, FIXTURE_ROOT, fixture.path)),
    });
  }

  const routes = (routeMap.routes ?? []).map((route) => ({
    ...route,
    method: route.method.toUpperCase(),
    value: fixtureSection(fixtures, route.fixture, route.section, route.id),
  }));

  return {
    fixtures,
    routes,
    mediaRoutes: routeMap.mediaRoutes ?? [],
    diagnosticStates: routeMap.diagnosticStates ?? [],
  };
}

export function findRoute(routeMap, method, pathname) {
  const normalizedMethod = method.toUpperCase();
  return routeMap.routes.find((route) => {
    if (route.method !== normalizedMethod) return false;
    return route.path === pathname;
  });
}

export function findMediaRoute(routeMap, method, pathname) {
  if (method.toUpperCase() !== "GET") return null;
  return routeMap.mediaRoutes.find((route) => {
    if (route.pathPattern.endsWith("/*")) {
      const prefix = route.pathPattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return route.pathPattern === pathname;
  }) ?? null;
}

function fixtureSection(fixtures, fixtureId, section, routeId) {
  const fixture = fixtures.get(fixtureId);
  if (!fixture) {
    throw new Error(`Route ${routeId} references missing fixture ${fixtureId}`);
  }
  const resolved = resolveSection(fixture.value, section);
  if (!resolved.found) {
    throw new Error(`Route ${routeId} references missing section ${section}`);
  }
  return resolved.value;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
