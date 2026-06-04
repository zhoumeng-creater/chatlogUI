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

  it("maps queue, worker, rate, ETA, source, and activity status fields", () => {
    const status = adaptGraphStatus({
      enabled: true,
      paused: false,
      running: true,
      history_queued: true,
      enqueue_running: true,
      workers: 3,
      enqueue_workers: 2,
      source_count: 7,
      started_at: "2026-06-04T00:00:00Z",
      processing_rate_per_minute: 18,
      estimated_seconds_left: 90,
      last_updated_at: "2026-06-04T00:05:00Z",
      pending: 5,
      processing: 2,
      processed: 11,
      failed: 1,
      progress_pct: 55,
    });

    expect(status).toMatchObject({
      historyQueued: true,
      enqueueRunning: true,
      workers: 3,
      enqueueWorkers: 2,
      startedAt: "2026-06-04T00:00:00Z",
      processingRatePerMinute: 18,
      estimatedSecondsLeft: 90,
      lastUpdatedAt: "2026-06-04T00:05:00Z",
      queueLabel: "history queued · enqueue running",
      workerLabel: "3 graph workers · 2 enqueue workers",
      rateLabel: "18/min",
      etaLabel: "1m 30s left",
      lastActivityLabel: "Updated 2026-06-04T00:05:00Z",
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
      relations: [{
        id: 2,
        subject: "Alice",
        predicate: "owns",
        object: "Project",
        status: "active",
        confidence: 0.9,
        support_score: 0.75,
        verified: true,
        conflict_group: "synthetic-conflict",
        valid_from: 1717000000,
        valid_to: 1717100000,
        evidence_count: 3,
      }],
      events: [{
        id: 3,
        title: "Launch",
        summary: "Synthetic private event body",
        event_time: 1717000000,
        confidence: 0.7,
        evidence: "Synthetic private evidence body",
      }],
      facts: [{
        id: 4,
        statement: "Alice owns Project",
        status: "active",
        confidence: 0.8,
        support_score: 0.6,
        verified: "verified",
        conflict_group: "synthetic-conflict",
        valid_from: 1717000000,
        valid_to: 1717100000,
        evidence: "Synthetic private fact body",
      }],
    });

    expect(query.entities[0].label).toBe("Alice");
    expect(query.relations[0].label).toBe("Alice owns Project");
    expect(query.events[0].label).toBe("Launch");
    expect(query.facts[0].label).toBe("Alice owns Project");
    expect(query.relations[0].detailRows).toContainEqual({ label: "Evidence", value: "3" });
    expect(query.relations[0].detailRows).toContainEqual({ label: "Verified", value: "true" });
    expect(query.facts[0].detailRows).toContainEqual({ label: "Support", value: "0.6" });
    expect(query.events[0].detailRows).toContainEqual({ label: "Evidence", value: "1" });
    expect(JSON.stringify(query)).not.toContain("Synthetic private event body");
    expect(JSON.stringify(query)).not.toContain("Synthetic private evidence body");
    expect(JSON.stringify(query)).not.toContain("Synthetic private fact body");
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
