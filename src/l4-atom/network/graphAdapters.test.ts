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

  it("maps sidecar-shaped queue, worker, timing, rate, and status labels", () => {
    const status = adaptGraphStatus({
      enabled: true,
      paused: false,
      running: true,
      history_queued: true,
      enqueue_running: true,
      workers: 2,
      enqueue_workers: 3,
      source_count: 12,
      pending: 8,
      processing: 1,
      processed: 24,
      failed: 2,
      started_at: "2026-06-04T01:00:00Z",
      processing_rate_per_minute: 45,
      estimated_seconds_left: 91,
      last_updated_at: "2026-06-04T01:30:00Z",
    });

    expect(status.historyQueued).toBe(true);
    expect(status.enqueueRunning).toBe(true);
    expect(status.workers).toBe(2);
    expect(status.enqueueWorkers).toBe(3);
    expect(status.startedAt).toBe("2026-06-04T01:00:00Z");
    expect(status.processingRatePerMinute).toBe(45);
    expect(status.estimatedSecondsLeft).toBe(91);
    expect(status.lastUpdatedAt).toBe("2026-06-04T01:30:00Z");
    expect(status.queueLabel).toBe("历史已入队 / 1 处理中");
    expect(status.workerLabel).toBe("2 图谱线程 / 3 入队线程");
    expect(status.etaLabel).toBe("约 2 分钟");
    expect(status.rateLabel).toBe("45/min");
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
      relations: [
        {
          id: 2,
          subject: "Alice",
          predicate: "owns",
          object: "Project",
          status: "active",
          confidence: 0.9,
          support_score: 0.81,
          verified: "supported",
          conflict_group: "ownership",
          valid_from: 1717200000,
          valid_to: 1717286400,
          evidence_count: 3,
          evidence_text: "synthetic private message body must not surface",
        },
      ],
      events: [{
        id: 3,
        event_type: "milestone",
        title: "Launch",
        event_time: 1717200000,
        actors: ["Alice"],
        targets: ["Project"],
        source_label: "synthetic source",
        evidence: "synthetic private event evidence must not surface",
      }],
      facts: [
        {
          id: 4,
          statement: "Alice owns Project",
          status: "active",
          change_type: "created",
          verified: "partial",
          valid_from: 1717200000,
          valid_to: 1717286400,
          support_score: 0.64,
          conflict_group: "ownership",
          evidence_count: 2,
          evidence: "synthetic private fact evidence must not surface",
        },
      ],
    });

    expect(query.entities[0].label).toBe("Alice");
    expect(query.relations[0].label).toBe("Alice owns Project");
    expect(query.events[0].label).toBe("Launch");
    expect(query.facts[0].label).toBe("Alice owns Project");
    expect(query.relations[0]).toMatchObject({
      verified: "supported",
      verifiedLabel: "已支持",
      validFrom: 1717200000,
      validTo: 1717286400,
      validFromLabel: "2024-06-01 00:00 UTC",
      validToLabel: "2024-06-02 00:00 UTC",
    });
    expect(query.events[0]).toMatchObject({
      type: "milestone",
      time: 1717200000,
      timeLabel: "2024-06-01 00:00 UTC",
      sourceLabel: "synthetic source",
    });
    expect(query.facts[0]).toMatchObject({
      changeType: "created",
      verified: "partial",
      verifiedLabel: "部分支持",
      validFrom: 1717200000,
      validTo: 1717286400,
    });
    expect(query.relations[0].detailRows).toEqual([
      { label: "主体", value: "Alice" },
      { label: "关系", value: "owns" },
      { label: "客体", value: "Project" },
      { label: "状态", value: "active" },
      { label: "置信度", value: "0.9" },
      { label: "支持度", value: "0.81" },
      { label: "验证", value: "已支持" },
      { label: "冲突组", value: "ownership" },
      { label: "有效开始", value: "2024-06-01 00:00 UTC" },
      { label: "有效结束", value: "2024-06-02 00:00 UTC" },
      { label: "证据数量", value: "3" },
    ]);
    expect(query.facts[0].detailRows).toEqual([
      { label: "事实", value: "Alice owns Project" },
      { label: "变化", value: "created" },
      { label: "状态", value: "active" },
      { label: "支持度", value: "0.64" },
      { label: "验证", value: "部分支持" },
      { label: "冲突组", value: "ownership" },
      { label: "有效开始", value: "2024-06-01 00:00 UTC" },
      { label: "有效结束", value: "2024-06-02 00:00 UTC" },
      { label: "证据数量", value: "2" },
    ]);
    expect(JSON.stringify(query)).not.toContain("synthetic private message body");
    expect(JSON.stringify(query)).not.toContain("synthetic private event evidence");
    expect(JSON.stringify(query)).not.toContain("synthetic private fact evidence");
  });

  it("derives stable query row ids when sidecar rows omit ids", () => {
    const query = adaptGraphQuery({
      entities: [{ name: "Alice", type: "person" }],
      relations: [{ subject: "Alice", predicate: "owns", object: "Project" }],
      events: [{ title: "Launch", event_type: "milestone", event_time: 1717200000 }],
      facts: [{ statement: "Alice owns Project", status: "active", valid_from: 1717200000 }],
    });

    expect(query.entities[0].id).toBe("Alice|person");
    expect(query.relations[0].id).toBe("Alice|owns|Project");
    expect(query.events[0].id).toBe("Launch|milestone|1717200000");
    expect(query.facts[0].id).toBe("Alice owns Project|active|1717200000");
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
