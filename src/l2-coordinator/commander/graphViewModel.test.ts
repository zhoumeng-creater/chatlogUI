import { describe, expect, it } from "vitest";
import {
  deriveGraphModuleView,
  resolveGraphWorkbenchItemIdFromCanvas,
} from "./graphViewModel";
import type {
  GraphQueryView,
  GraphStatusView,
  GraphTimelineView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";

describe("deriveGraphModuleView", () => {
  it("keeps unavailable or failed graph state optional", () => {
    expect(
      deriveGraphModuleView({
        statusSummary: status("unavailable"),
        visualize: null,
        visualizationRequested: false,
      }),
    ).toMatchObject({
      kind: "unavailable",
      blocksCoreWorkbench: false,
      canVisualize: false,
    });

    expect(
      deriveGraphModuleView({
        statusSummary: status("error", "graph worker failed"),
        visualize: null,
        visualizationRequested: false,
      }),
    ).toMatchObject({
      kind: "failed",
      blocksCoreWorkbench: false,
      message: "graph worker failed",
    });
  });

  it("keeps empty, malformed, and oversized states out of the canvas path", () => {
    for (const state of ["empty", "malformed", "oversized"] as const) {
      const view = deriveGraphModuleView({
        statusSummary: status("ready"),
        visualize: visualize(state),
        visualizationRequested: true,
      });

      expect(view.kind).toBe(state);
      expect(view.shouldMountCanvas).toBe(false);
      expect(view.canVisualize).toBe(false);
    }
  });

  it("allows canvas only after explicit visualization request with loaded data", () => {
    expect(
      deriveGraphModuleView({
        statusSummary: status("ready"),
        visualize: visualize("loaded"),
        visualizationRequested: false,
      }).shouldMountCanvas,
    ).toBe(false);

    expect(
      deriveGraphModuleView({
        statusSummary: status("ready"),
        visualize: visualize("loaded"),
        visualizationRequested: true,
      }),
    ).toMatchObject({
      kind: "loaded",
      canVisualize: true,
      shouldMountCanvas: true,
      tableRows: [{ id: "node-a", label: "Alice", type: "node" }],
    });
  });

  it("exposes graph status summaries for queue, workers, eta, and rate", () => {
    const view = deriveGraphModuleView({
      statusSummary: status("running", "", {
        queueLabel: "7 queued / 1 processing",
        workerLabel: "2 graph / 3 enqueue workers",
        etaLabel: "2 min remaining",
        rateLabel: "45/min",
      }),
      visualize: null,
      visualizationRequested: false,
    });

    expect(view.kind).toBe("loading");
    expect(view.statusSummary).toEqual({
      queueLabel: "7 queued / 1 processing",
      workerLabel: "2 graph / 3 enqueue workers",
      etaLabel: "2 min remaining",
      rateLabel: "45/min",
    });
  });

  it("keeps table fallback available when loaded canvas is not requested", () => {
    const view = deriveGraphModuleView({
      statusSummary: status("ready"),
      visualize: visualize("loaded"),
      query: query(),
      visualizationRequested: false,
    });

    expect(view.shouldMountCanvas).toBe(false);
    expect(view.canVisualize).toBe(true);
    expect(view.tableRows).toContainEqual({ id: "entity-a", label: "Alice", type: "node", detail: "person" });
  });

  it("derives workbench tabs, grouped lists, timeline, and selected inspector from query data", () => {
    const view = deriveGraphModuleView({
      statusSummary: status("ready"),
      visualize: visualize("loaded"),
      query: query(),
      timeline: timeline(),
      visualizationRequested: false,
      activeTab: "list",
      selectedItemId: "relation-2",
    });

    expect(view.tabs).toEqual([
      { id: "overview", label: "概览", active: false },
      { id: "list", label: "列表", active: true },
      { id: "timeline", label: "时间线", active: false },
      { id: "visualize", label: "可视化", active: false },
      { id: "qa", label: "问答", active: false },
      { id: "advanced", label: "高级", active: false },
    ]);
    expect(view.groupedSections.map((section) => [section.id, section.label, section.count])).toEqual([
      ["entities", "实体", 1],
      ["relations", "关系", 1],
      ["events", "事件", 1],
      ["facts", "事实", 1],
    ]);
    expect(view.groupedSections[1].rows[0]).toMatchObject({
      id: "relation-2",
      kind: "relation",
      label: "Alice owns Project",
      detail: "Alice owns Project",
      meta: ["active", "已支持", "证据 3"],
    });
    expect(view.timelineWorkbench.rows[0]).toMatchObject({
      id: "timeline-0",
      kind: "timeline",
      label: "Launch",
      detail: "2024-06-01 00:00 UTC",
      meta: ["event", "synthetic source"],
    });
    expect(view.detailInspector).toEqual({
      id: "relation-2",
      kind: "relation",
      title: "Alice owns Project",
      subtitle: "关系",
      rows: [{ label: "验证", value: "已支持" }],
      actions: [
        { id: "filter-related", label: "筛选相关项", enabled: true },
        { id: "focus-visualization", label: "聚焦可视化", enabled: true },
        { id: "graph-qa", label: "以此提问", enabled: true },
        { id: "open-source", label: "打开来源", enabled: false },
      ],
    });
  });

  it("maps canvas node and edge selections to workbench inspector rows", () => {
    expect(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "node",
      id: "a",
      query: query(),
    })).toBe("entity-a");

    expect(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "edge",
      id: "2",
      query: query(),
    })).toBe("relation-2");

    expect(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "node",
      id: "visual-node-a",
      label: "Alice",
      query: query(),
    })).toBe("entity-a");

    expect(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "edge",
      id: "visual-edge-a-project",
      label: "owns",
      sourceLabel: "Alice",
      targetLabel: "Project",
      query: query(),
    })).toBe("relation-2");

    expect(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "node",
      id: "missing-node",
      query: { ...query(), entities: [] },
    })).toBeNull();
  });
});

function status(
  state: GraphStatusView["state"],
  lastError = "",
  overrides: Partial<GraphStatusView> = {},
): GraphStatusView {
  return {
    state,
    enabled: state !== "unavailable",
    paused: state === "paused",
    running: state === "running",
    counts: { entities: 1, relations: 0, events: 0, facts: 0, sources: 0 },
    pending: 0,
    processing: 0,
    processed: 1,
    failed: 0,
    progressPct: state === "running" ? 40 : 100,
    lastError,
    historyQueued: false,
    enqueueRunning: false,
    workers: 0,
    enqueueWorkers: 0,
    startedAt: "",
    processingRatePerMinute: 0,
    estimatedSecondsLeft: 0,
    lastUpdatedAt: "",
    queueLabel: "",
    workerLabel: "",
    etaLabel: "",
    rateLabel: "",
    ...overrides,
  };
}

function query(): GraphQueryView {
  return {
    entities: [
      {
        id: "a",
        label: "Alice",
        type: "person",
        mentions: 2,
        detailRows: [{ label: "类型", value: "person" }],
      },
    ],
    relations: [
      {
        id: "2",
        label: "Alice owns Project",
        subject: "Alice",
        predicate: "owns",
        object: "Project",
        status: "active",
        confidence: 0.9,
        supportScore: 0.81,
        verified: "supported",
        verifiedLabel: "已支持",
        conflictGroup: "",
        validFrom: 1717200000,
        validTo: 0,
        validFromLabel: "2024-06-01 00:00 UTC",
        validToLabel: "",
        evidenceCount: 3,
        detailRows: [{ label: "验证", value: "已支持" }],
      },
    ],
    events: [
      {
        id: "3",
        label: "Launch",
        type: "event",
        time: 1717200000,
        timeLabel: "2024-06-01 00:00 UTC",
        sourceLabel: "synthetic source",
        actors: ["Alice"],
        targets: ["Project"],
        detailRows: [{ label: "类型", value: "event" }],
      },
    ],
    facts: [
      {
        id: "4",
        label: "Alice owns Project",
        changeType: "created",
        status: "active",
        supportScore: 0.64,
        verified: "partial",
        verifiedLabel: "部分支持",
        conflictGroup: "",
        validFrom: 1717200000,
        validTo: 0,
        validFromLabel: "2024-06-01 00:00 UTC",
        validToLabel: "",
        evidenceCount: 2,
        detailRows: [{ label: "验证", value: "部分支持" }],
      },
    ],
  };
}

function timeline(): GraphTimelineView {
  return {
    count: 1,
    rows: [
      {
        time: 1717200000,
        type: "event",
        title: "Launch",
        description: "Project launch",
        source: "synthetic source",
      },
    ],
  };
}

function visualize(state: GraphVisualizeView["state"]): GraphVisualizeView {
  return {
    state,
    nodes: state === "loaded"
      ? [{ id: "a", name: "Alice", label: "Alice", kind: "person", value: 2, last_seen: 1 }]
      : [],
    edges: [],
    timelineRows: [],
    generatedAt: 1,
    error: state === "malformed" ? "Malformed graph payload." : "",
    summary: {
      nodeCount: state === "loaded" ? 1 : 0,
      edgeCount: 0,
      timelineCount: 0,
    },
  };
}
