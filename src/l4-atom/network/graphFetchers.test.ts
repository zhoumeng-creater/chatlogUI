import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchGraphQuery } from "./fetchGraphQuery";
import { fetchGraphStatus } from "./fetchGraphStatus";
import { fetchGraphTimeline } from "./fetchGraphTimeline";
import { fetchGraphVisualize } from "./fetchGraphVisualize";
import { manageGraph } from "./manageGraph";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("graph REST atoms", () => {
  it("uses requestJson and adapts graph status, query, visualize, timeline, and actions", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        const path = new URL(url).pathname;

        if (path.endsWith("/api/v1/graph/status")) {
          return json({ enabled: true, entity_count: 1, relation_count: 2, progress_pct: 100 });
        }
        if (path.endsWith("/api/v1/graph/query")) {
          return json({ entities: [{ id: 1, name: "Alice" }], relations: [], events: [], facts: [] });
        }
        if (path.endsWith("/api/v1/graph/visualize")) {
          return json({ nodes: [{ id: "a", name: "Alice" }], edges: [], timeline: [], generated_at: 1 });
        }
        if (path.endsWith("/api/v1/graph/timeline")) {
          return json({ items: [{ time: 1, type: "event", title: "Launch", description: "Done" }], count: 1 });
        }
        if (path.endsWith("/api/v1/graph/rebuild")) {
          return json({ ok: true, accepted: true, status: "running" });
        }

        return json({});
      }),
    );

    const status = await fetchGraphStatus();
    const query = await fetchGraphQuery({ keyword: "Alice", limit: 500 });
    const visualize = await fetchGraphVisualize({ keyword: "Alice", limit: 500 });
    const timeline = await fetchGraphTimeline({ keyword: "Alice" });
    const action = await manageGraph("rebuild");

    expect(status?.state).toBe("ready");
    expect(query.entities[0].label).toBe("Alice");
    expect(visualize.state).toBe("loaded");
    expect(timeline.rows[0].title).toBe("Launch");
    expect(action).toEqual({ ok: true, accepted: true, status: "running", error: "" });
    expect(calls.every((call) => call.url.includes("format=json"))).toBe(true);
    expect(calls.find((call) => call.url.includes("/graph/query"))?.url).toContain("limit=300");
    expect(calls.find((call) => call.url.includes("/graph/visualize"))?.url).toContain("limit=300");
  });

  it("emits redacted graph diagnostic events when diagnostics are supplied", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ entities: [], relations: [], events: [], facts: [] })),
    );

    await fetchGraphQuery(
      { keyword: "Synthetic private message for redaction test only", entity: "wxid_synthetic_redaction_case" },
      undefined,
      {
        diagnostics: { endpointFamily: "graph", recoveryHint: "retry" },
        onDiagnosticEvent: (event) => events.push(event),
      },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      attributes: { endpointFamily: "graph" },
    });
    expect(JSON.stringify(events[0])).not.toContain("Synthetic private message");
    expect(JSON.stringify(events[0])).not.toContain("wxid_synthetic");
  });
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
