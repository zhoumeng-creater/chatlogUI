import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateFixtureWorkspace } from "./validate-e2e-fixtures.mjs";

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixtureWorkspace(root, overrides = {}) {
  const fixtureDir = join(root, "e2e", "fixtures");
  const routeDir = join(root, "e2e", "mock-chatlog-server");
  await mkdir(fixtureDir, { recursive: true });
  await mkdir(routeDir, { recursive: true });

  const fixture = {
    synthetic: true,
    fixturePurpose: "Synthetic test fixture",
    privacyNotes: "No real private data.",
    routes: {
      "/health": { status: "ok" },
      "/api/v1/sessions": { sessions: [] },
    },
    ...overrides.fixture,
  };

  const manifest = {
    synthetic: true,
    fixtures: [
      {
        id: "core",
        path: "core-ready.json",
        routeFamilies: ["core"],
        privacySensitivity: "low",
      },
    ],
    routeStates: [
      {
        id: "health",
        fixture: "core",
        section: "routes./health",
        method: "GET",
        path: "/health",
      },
      {
        id: "sessions",
        fixture: "core",
        section: "routes./api/v1/sessions",
        method: "GET",
        path: "/api/v1/sessions",
      },
    ],
    ...overrides.manifest,
  };

  const routeMap = {
    synthetic: true,
    routes: [
      {
        id: "health",
        method: "GET",
        path: "/health",
        fixture: "core",
        section: "routes./health",
      },
      {
        id: "sessions",
        method: "GET",
        path: "/api/v1/sessions",
        fixture: "core",
        section: "routes./api/v1/sessions",
      },
    ],
    ...overrides.routeMap,
  };

  await writeJson(join(fixtureDir, "core-ready.json"), fixture);
  await writeJson(join(fixtureDir, "fixture-manifest.json"), manifest);
  await writeJson(join(routeDir, "route-map.json"), routeMap);

  return root;
}

describe("validateFixtureWorkspace", () => {
  it("accepts a synthetic fixture manifest with resolved route-map sections", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-ok-")));

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.routes.map((route) => route.id)).toEqual(["health", "sessions"]);
  });

  it("fails when a manifest or route-map section cannot be resolved", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-missing-")), {
      routeMap: {
        routes: [
          {
            id: "missing",
            method: "GET",
            path: "/api/v1/missing",
            fixture: "core",
            section: "routes./api/v1/missing",
          },
        ],
      },
    });

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("routes./api/v1/missing");
  });

  it("fails when route contract shapes drift from current L4 adapters", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-shape-")), {
      fixture: {
        routes: {
          "/health": { status: "ok" },
          "/api/v1/sessions": { sessions: [] },
          "/api/v1/db/tables": { items: ["SyntheticMessages"] },
        },
      },
      manifest: {
        routeStates: [
          {
            id: "db-tables",
            fixture: "core",
            section: "routes./api/v1/db/tables",
            method: "GET",
            path: "/api/v1/db/tables",
          },
        ],
      },
      routeMap: {
        routes: [
          {
            id: "db-tables",
            method: "GET",
            path: "/api/v1/db/tables",
            fixture: "core",
            section: "routes./api/v1/db/tables",
          },
        ],
      },
    });

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("must resolve to an array of table names");
  });

  it("fails closed on real-looking secrets and unapproved local paths", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-secret-")), {
      fixture: {
        routes: {
          "/health": {
            status: "ok",
            leakedToken: "Bearer abcdefghijklmnopqrstuvwx1234567890",
            leakedPath: "C:\\Users\\Alice\\WeChat Files\\wxid_real",
          },
          "/api/v1/sessions": { sessions: [] },
        },
      },
    });

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("Bearer");
    expect(result.errors.join("\n")).toContain("C:\\Users\\Alice");
  });

  it("fails when an advanced fixture family lacks success plus edge contract states", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-family-")), {
      manifest: {
        fixtures: [
          {
            id: "advanced",
            path: "core-ready.json",
            routeFamilies: ["media"],
            privacySensitivity: "high",
          },
        ],
        routeStates: [
          {
            id: "media.success",
            fixture: "advanced",
            section: "routes./api/v1/sessions",
            method: "GET",
            path: "/api/v1/sessions",
            family: "media",
            state: "success",
          },
        ],
      },
      routeMap: {
        routes: [
          {
            id: "media.success",
            fixture: "advanced",
            section: "routes./api/v1/sessions",
            method: "GET",
            path: "/api/v1/sessions",
          },
        ],
      },
    });

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("advanced family media needs at least one edge or failure state");
  });

  it("requires P3 semantic and graph contract state coverage", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-p3-coverage-")), {
      fixture: {
        routes: {
          "/health": { status: "ok" },
          "/api/v1/sessions": { sessions: [] },
          "/api/v1/semantic/index/status": { ready: true, running: false, paused: false },
          "/api/v1/graph/status": { enabled: true, running: false, paused: false },
        },
      },
      manifest: {
        routeStates: [
          {
            id: "semantic-index-status.ready",
            fixture: "core",
            section: "routes./api/v1/semantic/index/status",
            method: "GET",
            path: "/api/v1/semantic/index/status",
            family: "semantic_contract",
            state: "ready",
          },
          {
            id: "graph-status.ready",
            fixture: "core",
            section: "routes./api/v1/graph/status",
            method: "GET",
            path: "/api/v1/graph/status",
            family: "graph_contract",
            state: "ready",
          },
        ],
      },
      routeMap: {
        routes: [
          {
            id: "semantic-index-status.ready",
            method: "GET",
            path: "/api/v1/semantic/index/status",
            fixture: "core",
            section: "routes./api/v1/semantic/index/status",
            family: "semantic_contract",
            state: "ready",
          },
          {
            id: "graph-status.ready",
            method: "GET",
            path: "/api/v1/graph/status",
            fixture: "core",
            section: "routes./api/v1/graph/status",
            family: "graph_contract",
            state: "ready",
          },
        ],
      },
    });

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("semantic_contract needs state running");
    expect(result.errors.join("\n")).toContain("semantic_qa_stream needs state empty");
    expect(result.errors.join("\n")).toContain("graph_contract needs state oversized");
  });
});
