import { beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "./useGraphStore";
import type {
  GraphActionResult,
  GraphStatusView,
  GraphTimelineView,
  GraphVisualizeView,
} from "@l4/network/graphAdapters";
import type {
  GraphConfigView,
  GraphIngestResult,
  GraphQAResponseView,
} from "@l4/network";

describe("useGraphStore", () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
  });

  it("tracks a two-step confirmation gate for advanced graph mutations", () => {
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();

    useGraphStore.getState().requestAdvancedConfirmation("business");
    expect(useGraphStore.getState().advancedConfirmationPending).toBe("business");
    expect(useGraphStore.getState().ingestStatus).toBe("idle");

    useGraphStore.getState().cancelAdvancedConfirmation();
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();

    useGraphStore.getState().requestAdvancedConfirmation("qa");
    useGraphStore.getState().setQALoading();
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();
  });

  it("tracks workbench tabs, filters, graph query data, and selected inspector item", () => {
    useGraphStore.getState().setActiveTab("timeline");
    useGraphStore.getState().setGraphFilters({
      keyword: "Alice",
      timeWindow: "7d",
      entityFilter: "person",
      relationFilter: "owns",
      limit: 120,
      start: "2026-06-01",
      end: "2026-06-04",
    });
    useGraphStore.getState().setSelectedGraphItem("relation-2");
    useGraphStore.getState().setQuery({
      entities: [],
      relations: [],
      events: [],
      facts: [],
    });

    expect(useGraphStore.getState()).toMatchObject({
      activeTab: "timeline",
      keyword: "Alice",
      timeWindow: "7d",
      entityFilter: "person",
      relationFilter: "owns",
      limit: 120,
      start: "2026-06-01",
      end: "2026-06-04",
      selectedGraphItemId: "relation-2",
      query: {
        entities: [],
        relations: [],
        events: [],
        facts: [],
      },
    });

    useGraphStore.getState().clearGraphFilters();
    expect(useGraphStore.getState()).toMatchObject({
      keyword: "",
      timeWindow: "",
      entityFilter: "",
      relationFilter: "",
      limit: 80,
      start: "",
      end: "",
      selectedGraphItemId: "relation-2",
    });
  });

  it("drops stale graph load completions after a newer request or cancel", () => {
    useGraphStore.getState().startGraphLoadRequest("graph-a");
    useGraphStore.getState().startGraphLoadRequest("graph-b");

    expect(useGraphStore.getState()).toMatchObject({
      activeLoadRequestId: "graph-b",
      loading: true,
      loadStatus: "loading",
    });

    expect(useGraphStore.getState().completeGraphVisualizeRequest("graph-a", visualize("stale"))).toBe(false);
    expect(useGraphStore.getState().visualize).toBeNull();
    expect(useGraphStore.getState().activeLoadRequestId).toBe("graph-b");

    expect(useGraphStore.getState().completeGraphVisualizeRequest("graph-b", visualize("fresh"))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeLoadRequestId: null,
      loading: false,
      loadStatus: "loaded",
      visualize: { generatedAt: 2 },
    });

    useGraphStore.getState().startGraphLoadRequest("graph-c");
    useGraphStore.getState().cancelGraphLoadRequest();
    expect(useGraphStore.getState().completeGraphVisualizeRequest("graph-c", visualize("cancelled"))).toBe(false);
    expect(useGraphStore.getState()).toMatchObject({
      activeLoadRequestId: null,
      loadStatus: "cancelled",
    });
  });

  it("drops stale graph child completions after newer status, timeline, action, config, ingest, or QA requests", () => {
    const store = useGraphStore.getState();

    store.startGraphStatusRequest("status-a");
    store.startGraphStatusRequest("status-b");
    expect(store.completeGraphStatusRequest("status-a", statusView("stale"))).toBe(false);
    expect(useGraphStore.getState().statusSummary).toBeNull();
    expect(store.completeGraphStatusRequest("status-b", statusView("fresh"))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeStatusRequestId: null,
      statusSummary: { queueLabel: "fresh queue" },
    });

    store.startGraphTimelineRequest("timeline-a");
    store.startGraphTimelineRequest("timeline-b");
    expect(store.completeGraphTimelineRequest("timeline-a", timeline("stale"))).toBe(false);
    expect(useGraphStore.getState().timeline).toBeNull();
    expect(store.completeGraphTimelineRequest("timeline-b", timeline("fresh"))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeTimelineRequestId: null,
      timeline: { rows: [{ title: "fresh" }] },
    });

    store.startGraphActionRequest("action-a");
    store.startGraphActionRequest("action-b");
    expect(store.completeGraphActionRequest("action-a", actionResult("stale"))).toBe(false);
    expect(useGraphStore.getState().actionStatus).toBeNull();
    expect(store.completeGraphActionRequest("action-b", actionResult("fresh"))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeActionRequestId: null,
      actionStatus: { status: "fresh" },
    });

    store.startGraphConfigRequest("config-a");
    store.startGraphConfigRequest("config-b");
    expect(store.completeGraphConfigRequest("config-a", config(1))).toBe(false);
    expect(useGraphStore.getState().advancedConfig).toBeNull();
    expect(store.completeGraphConfigRequest("config-b", config(2))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeAdvancedConfigRequestId: null,
      advancedConfigStatus: "ready",
      advancedConfig: { workers: 2, enqueueWorkers: 2 },
      graphConfigDraft: { workers: 2, enqueueWorkers: 2 },
    });

    store.startGraphIngestRequest("ingest-a");
    store.startGraphIngestRequest("ingest-b");
    expect(store.completeGraphIngestRequest("ingest-a", ingestResult("stale"))).toBe(false);
    expect(useGraphStore.getState().ingestResult?.statusLabel).not.toBe("stale");
    expect(store.completeGraphIngestRequest("ingest-b", ingestResult("fresh"))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeIngestRequestId: null,
      ingestStatus: "ready",
      ingestResult: { statusLabel: "fresh" },
    });

    store.startGraphQARequest("qa-a");
    store.startGraphQARequest("qa-b");
    expect(store.completeGraphQARequest("qa-a", qaResult("stale"))).toBe(false);
    expect(useGraphStore.getState().qaResult?.answerPreview).not.toBe("stale");
    expect(store.completeGraphQARequest("qa-b", qaResult("fresh"))).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeQARequestId: null,
      qaStatus: "ready",
      qaResult: { answerPreview: "fresh" },
    });
  });

  it("drops stale graph child failures and applies only the active failure", () => {
    const store = useGraphStore.getState();

    store.startGraphStatusRequest("status-a");
    store.startGraphStatusRequest("status-b");
    expect(store.failGraphStatusRequest("status-a", "old status error")).toBe(false);
    expect(useGraphStore.getState().error).toBeNull();
    expect(store.failGraphStatusRequest("status-b", "new status error")).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeStatusRequestId: null,
      error: "new status error",
      loadStatus: "error",
    });

    store.startGraphTimelineRequest("timeline-a");
    store.startGraphTimelineRequest("timeline-b");
    expect(store.failGraphTimelineRequest("timeline-a")).toBe(false);
    expect(store.failGraphTimelineRequest("timeline-b")).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeTimelineRequestId: null,
      timeline: null,
    });

    store.startGraphActionRequest("action-a");
    store.startGraphActionRequest("action-b");
    expect(store.failGraphActionRequest("action-a", "old action error")).toBe(false);
    expect(store.failGraphActionRequest("action-b", "new action error")).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeActionRequestId: null,
      error: "new action error",
      loadStatus: "error",
    });

    store.startGraphConfigRequest("config-a");
    store.startGraphConfigRequest("config-b");
    expect(store.failGraphConfigRequest("config-a", "old config error")).toBe(false);
    expect(useGraphStore.getState().advancedConfigError).toBeNull();
    expect(store.failGraphConfigRequest("config-b", "new config error")).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeAdvancedConfigRequestId: null,
      advancedConfigStatus: "error",
      advancedConfigError: "new config error",
    });

    store.startGraphIngestRequest("ingest-a");
    store.startGraphIngestRequest("ingest-b");
    expect(store.failGraphIngestRequest("ingest-a", "old ingest error")).toBe(false);
    expect(useGraphStore.getState().ingestError).toBeNull();
    expect(store.failGraphIngestRequest("ingest-b", "new ingest error")).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeIngestRequestId: null,
      ingestStatus: "error",
      ingestError: "new ingest error",
    });

    store.startGraphQARequest("qa-a");
    store.startGraphQARequest("qa-b");
    expect(store.failGraphQARequest("qa-a", "old qa error")).toBe(false);
    expect(useGraphStore.getState().qaError).toBeNull();
    expect(store.failGraphQARequest("qa-b", "new qa error")).toBe(true);
    expect(useGraphStore.getState()).toMatchObject({
      activeQARequestId: null,
      qaStatus: "error",
      qaError: "new qa error",
    });
  });

  it("cancels active graph child requests so late completions cannot overwrite state", () => {
    const store = useGraphStore.getState();

    store.startGraphStatusRequest("status-c");
    store.startGraphTimelineRequest("timeline-c");
    store.startGraphActionRequest("action-c");
    store.startGraphConfigRequest("config-c");
    store.startGraphIngestRequest("ingest-c");
    store.startGraphQARequest("qa-c");

    store.cancelGraphLoadRequest();

    expect(store.completeGraphStatusRequest("status-c", statusView("cancelled"))).toBe(false);
    expect(store.completeGraphTimelineRequest("timeline-c", timeline("cancelled"))).toBe(false);
    expect(store.completeGraphActionRequest("action-c", actionResult("cancelled"))).toBe(false);
    expect(store.completeGraphConfigRequest("config-c", config(3))).toBe(false);
    expect(store.completeGraphIngestRequest("ingest-c", ingestResult("cancelled"))).toBe(false);
    expect(store.completeGraphQARequest("qa-c", qaResult("cancelled"))).toBe(false);

    expect(useGraphStore.getState()).toMatchObject({
      activeStatusRequestId: null,
      activeTimelineRequestId: null,
      activeActionRequestId: null,
      activeAdvancedConfigRequestId: null,
      activeIngestRequestId: null,
      activeQARequestId: null,
      loadStatus: "cancelled",
      advancedConfigStatus: "cancelled",
      ingestStatus: "cancelled",
      qaStatus: "cancelled",
      statusSummary: null,
      timeline: null,
      actionStatus: null,
      advancedConfig: null,
      ingestResult: null,
      qaResult: null,
    });
  });
});

function visualize(kind: "stale" | "fresh" | "cancelled"): GraphVisualizeView {
  return {
    state: "loaded",
    nodes: [],
    edges: [],
    timelineRows: [],
    generatedAt: kind === "fresh" ? 2 : 1,
    error: "",
    summary: {
      nodeCount: 0,
      edgeCount: 0,
      timelineCount: 0,
    },
  };
}

function statusView(label: "stale" | "fresh" | "cancelled"): GraphStatusView {
  return {
    state: "ready",
    enabled: true,
    paused: false,
    running: false,
    counts: {
      entities: 0,
      relations: 0,
      events: 0,
      facts: 0,
      sources: 0,
    },
    pending: 0,
    processing: 0,
    processed: 0,
    failed: 0,
    progressPct: 100,
    lastError: "",
    historyQueued: false,
    enqueueRunning: false,
    workers: 1,
    enqueueWorkers: 1,
    startedAt: "",
    processingRatePerMinute: 0,
    estimatedSecondsLeft: 0,
    lastUpdatedAt: "",
    queueLabel: `${label} queue`,
    workerLabel: "1 图谱线程 / 1 入队线程",
    etaLabel: "",
    rateLabel: "",
  };
}

function timeline(title: "stale" | "fresh" | "cancelled"): GraphTimelineView {
  return {
    count: 1,
    rows: [
      {
        time: 1,
        type: "event",
        title,
        description: "",
        source: "",
      },
    ],
  };
}

function actionResult(status: "stale" | "fresh" | "cancelled"): GraphActionResult {
  return {
    ok: true,
    accepted: true,
    status,
    error: "",
  };
}

function config(workers: number): GraphConfigView {
  return {
    workers,
    enqueueWorkers: workers,
  };
}

function ingestResult(statusLabel: "stale" | "fresh" | "cancelled"): GraphIngestResult {
  return {
    kind: "business",
    ok: true,
    count: 1,
    idCount: 1,
    statusLabel,
  };
}

function qaResult(answerPreview: "stale" | "fresh" | "cancelled"): GraphQAResponseView {
  return {
    hasAnswer: true,
    answerPreview,
    evidenceCount: 1,
    evidenceSummary: "1 条证据已隐藏",
  };
}
