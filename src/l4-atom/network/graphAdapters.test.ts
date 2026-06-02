import { describe, expect, it } from "vitest";
import {
  adaptGraphActionResult,
  adaptGraphQuery,
  adaptGraphStatus,
  adaptGraphTimeline,
  adaptGraphVisualize,
} from "./graphAdapters";

describe("adaptGraphStatus", () => {
  it("maps ready and running graph status", () => {
    expect(
      adaptGraphStatus({
        enabled: true,
        paused: false,
        running: false,
        entity_count: 10,
        relation_count: 4,
        event_count: 3,
        fact_count: 2,
        source_count: 12,
        pending: 0,
        processing: 0,
        processed: 20,
        failed: 0,
        progress_pct: 100,
      }),
    ).toMatchObject({
      state: "ready",
      counts: { entities: 10, relations: 4, events: 3, facts: 2, sources: 12 },
      progressPct: 100,
    });

    expect(adaptGraphStatus({ enabled: true, running: true, progress_pct: 33 })).toMatchObject({
      state: "running",
      progressPct: 33,
    });
  });

  it("maps disabled and error states", () => {
    expect(adaptGraphStatus({ enabled: false })).toMatchObject({ state: "unavailable" });
    expect(adaptGraphStatus({ enabled: true, last_error: "graph worker failed" })).toMatchObject({
      state: "error",
      lastError: "graph worker failed",
    });
  });
});

describe("adaptGraphVisualize", () => {
  it("maps valid visualize payloads", () => {
    const view = adaptGraphVisualize(
      {
        nodes: [{ id: "a", name: "Alice", kind: "person", value: 3, last_seen: 1717000000 }],
        edges: [{ id: "e1", source: "a", target: "b", label: "knows", confidence: 0.8 }],
        timeline: [{ time: 1717000000, type: "event", title: "Met", description: "Project sync", source: "Alice" }],
        generated_at: 1717000100,
      },
      { visualizationCap: 300 },
    );

    expect(view.state).toBe("loaded");
    expect(view.nodes[0].label).toBe("Alice");
    expect(view.edges[0].label).toBe("knows");
    expect(view.timelineRows[0].source).toBe("Alice");
    expect(view.generatedAt).toBe(1717000100);
  });

  it("classifies empty, malformed, and oversized payloads before rendering", () => {
    expect(adaptGraphVisualize({ nodes: [], edges: [], timeline: [] }, { visualizationCap: 300 }).state).toBe("empty");
    expect(adaptGraphVisualize({ nodes: [{ name: "Missing id" }], edges: [] }, { visualizationCap: 300 }).state).toBe("malformed");
    expect(
      adaptGraphVisualize(
        { nodes: Array.from({ length: 301 }, (_, index) => ({ id: `n${index}`, name: `Node ${index}` })), edges: [] },
        { visualizationCap: 300 },
      ).state,
    ).toBe("oversized");
  });
});

describe("graph query, timeline, and action adapters", () => {
  it("maps query response tables", () => {
    const query = adaptGraphQuery({
      entities: [{ id: 1, name: "Alice", type: "person", mentions: 2 }],
      relations: [{ id: 2, subject: "Alice", predicate: "owns", object: "Project", confidence: 0.9 }],
      events: [{ id: 3, title: "Launch", event_time: 1717000000 }],
      facts: [{ id: 4, statement: "Alice owns Project" }],
    });

    expect(query.entities[0].label).toBe("Alice");
    expect(query.relations[0].label).toBe("Alice owns Project");
    expect(query.events[0].label).toBe("Launch");
    expect(query.facts[0].label).toBe("Alice owns Project");
  });

  it("maps timeline rows and action responses", () => {
    expect(
      adaptGraphTimeline({
        items: [{ time: 1717000000, type: "fact", title: "Fact", description: "Detail", source: "wxid_a" }],
        count: 1,
      }),
    ).toEqual({
      count: 1,
      rows: [{ time: 1717000000, type: "fact", title: "Fact", description: "Detail", source: "wxid_a" }],
    });

    expect(adaptGraphActionResult({ ok: true, accepted: true, status: "running" })).toEqual({
      ok: true,
      accepted: true,
      status: "running",
      error: "",
    });
  });
});
