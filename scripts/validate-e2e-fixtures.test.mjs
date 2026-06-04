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

  it("fails when graph workbench fixture shapes drift from the sidecar contract", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-graph-shape-")), {
      fixture: {
        routes: {
          "/api/v1/graph/status": {
            enabled: true,
            history_queued: 3,
          },
          "/api/v1/graph/query": {
            relations: [
              {
                verified: true,
                valid_from: "2026-01-01",
              },
            ],
            facts: [
              {
                verified: false,
                valid_to: "2026-01-31",
              },
            ],
            events: [
              {
                time: "2026-01-01T00:00:00Z",
              },
            ],
          },
          "/api/v1/graph/timeline": {
            items: [
              {
                time: "2026-01-01T00:00:00Z",
              },
            ],
          },
          "/api/v1/graph/qa": { answer: "Synthetic answer" },
        },
      },
      manifest: {
        routeStates: [
          {
            id: "graph-status",
            fixture: "core",
            section: "routes./api/v1/graph/status",
            method: "GET",
            path: "/api/v1/graph/status",
          },
          {
            id: "graph-query",
            fixture: "core",
            section: "routes./api/v1/graph/query",
            method: "GET",
            path: "/api/v1/graph/query",
          },
          {
            id: "graph-timeline",
            fixture: "core",
            section: "routes./api/v1/graph/timeline",
            method: "GET",
            path: "/api/v1/graph/timeline",
          },
          {
            id: "graph-qa",
            fixture: "core",
            section: "routes./api/v1/graph/qa",
            method: "GET",
            path: "/api/v1/graph/qa",
          },
        ],
      },
      routeMap: {
        routes: [
          {
            id: "graph-status",
            method: "GET",
            path: "/api/v1/graph/status",
            fixture: "core",
            section: "routes./api/v1/graph/status",
          },
          {
            id: "graph-query",
            method: "GET",
            path: "/api/v1/graph/query",
            fixture: "core",
            section: "routes./api/v1/graph/query",
          },
          {
            id: "graph-timeline",
            method: "GET",
            path: "/api/v1/graph/timeline",
            fixture: "core",
            section: "routes./api/v1/graph/timeline",
          },
          {
            id: "graph-qa",
            method: "GET",
            path: "/api/v1/graph/qa",
            fixture: "core",
            section: "routes./api/v1/graph/qa",
          },
        ],
      },
    });

    const result = await validateFixtureWorkspace(root);
    const errors = result.errors.join("\n");

    expect(result.ok).toBe(false);
    expect(errors).toContain("graph status history_queued must be boolean");
    expect(errors).toContain("graph relations[0].verified must be a string status");
    expect(errors).toContain("graph relations[0].valid_from must be Unix seconds");
    expect(errors).toContain("graph facts[0].verified must be a string status");
    expect(errors).toContain("graph timeline[0].time must be Unix seconds");
    expect(errors).toContain("/api/v1/graph/qa must be registered as POST");
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

  it("fails when P3 semantic and graph contract state coverage is incomplete", async () => {
    const root = await createFixtureWorkspace(await mkdtemp(join(tmpdir(), "fixture-p3-coverage-")), {
      manifest: {
        requiredStateCoverage: { p3SemanticGraph: true },
        routeStates: [
          {
            id: "semantic-index.ready",
            fixture: "core",
            section: "routes./api/v1/sessions",
            method: "N/A",
            path: "contract:semantic-index",
            family: "semantic_index",
            state: "ready",
          },
        ],
      },
    });

    const result = await validateFixtureWorkspace(root);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("semantic_index needs state running");
    expect(result.errors.join("\n")).toContain("semantic_qa needs state completed");
    expect(result.errors.join("\n")).toContain("graph_status needs state loaded");
    expect(result.errors.join("\n")).toContain("graph_query needs state detail");
  });
});
