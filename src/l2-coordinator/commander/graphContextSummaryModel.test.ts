import { describe, expect, it } from "vitest";
import {
  buildGraphCommanderContext,
  buildGraphContextSummary,
  buildGraphSourceWorkbenchRoute,
} from "./graphContextSummaryModel";
import type { GraphStatusView, GraphVisualizeView } from "@/l4-atom/network/graphAdapters";

describe("buildGraphContextSummary", () => {
  it("keeps route source and scope context separate for summaries and exports", () => {
    const context = buildGraphCommanderContext({
      routeSource: "search",
      sourceLabel: "来自搜索结果",
      focusLabel: "已从上下文进入，可在本页筛选定位对象。",
      scopeLabel: "全部会话",
      privacyOn: false,
    });

    expect(context.source).toEqual({
      kind: "search",
      label: "来自搜索结果 · 上下文定位",
    });
    expect(context.scopeSummary).toBe("全部会话");

    const privateContext = buildGraphCommanderContext({
      routeSource: "workbench",
      sourceLabel: "来自会话工作台",
      scopeLabel: "当前会话：wxid_synthetic_private",
      privacyOn: true,
    });

    expect(privateContext.source).toEqual({
      kind: "workbench",
      label: "来自会话工作台",
    });
    expect(privateContext.scopeSummary).toBe("当前会话（已隐藏）");
    expect(buildGraphSourceWorkbenchRoute("workbench-ready")).toBe(
      "/workbench?source=graph&returnRoute=%2Fgraph%3Fcodex-smoke%3Dworkbench-ready&codex-smoke=workbench-ready",
    );
  });

  it("explains current filters, source, timestamps, freshness, and partial state", () => {
    const summary = buildGraphContextSummary({
      loadStatus: "loaded",
      statusSummary: status({ running: true, pending: 2, processing: 1, failed: 1 }),
      visualize: visualize(),
      appliedRequest: {
        keyword: "Synthetic Entity Alpha",
        window: "30d",
        entity: "person",
        relation: "owns",
        limit: 120,
        start: "2026-01-01",
        end: "2026-01-31",
      },
      draftRequest: {
        keyword: "Synthetic Entity Beta",
        window: "30d",
        entity: "person",
        relation: "owns",
        limit: 120,
        start: "2026-01-01",
        end: "2026-01-31",
      },
      source: { kind: "graph", label: "图谱当前视图" },
      lastLoadedAt: "2026-01-02T03:05:00.000Z",
      lastRefreshedAt: "2026-01-02T03:05:30.000Z",
      privacyOn: false,
    });

    expect(summary.metrics).toEqual([
      { label: "实体", value: 3 },
      { label: "关系", value: 2 },
      { label: "事件", value: 1 },
      { label: "事实", value: 4 },
      { label: "来源", value: 5 },
    ]);
    expect(summary.filterChips).toContain("关键词：Synthetic Entity Alpha");
    expect(summary.filterChips).toContain("时间：近 30 天");
    expect(summary.sourceLabel).toBe("来源：图谱当前视图");
    expect(summary.generatedLabel).toContain("生成：2026-01-02");
    expect(summary.refreshedLabel).toContain("刷新：2026-01-02");
    expect(summary.freshnessState).toBe("partial");
    expect(summary.warnings).toContain("筛选条件有未应用更改，当前摘要仍显示上一次刷新结果。");
    expect(summary.warnings).toContain("图谱任务仍有 3 项处理中或等待处理。");
    expect(summary.warnings).toContain("1 项图谱处理失败，结果可能不完整。");
    expect(summary.technicalDetails).toContain("1 图谱线程 / 1 入队线程");
  });

  it("handles empty, malformed, oversized, cancelled, error, and privacy states without leaking private labels", () => {
    const privateLabel = "wxid_synthetic_private_path Synthetic Secret";
    for (const loadStatus of ["empty", "malformed", "oversized", "cancelled", "error"] as const) {
      const summary = buildGraphContextSummary({
        loadStatus,
        statusSummary: status({ lastError: `${privateLabel} failed` }),
        visualize: loadStatus === "empty" ? emptyVisualize() : null,
        appliedRequest: { keyword: privateLabel, limit: 80 },
        draftRequest: { keyword: privateLabel, limit: 80 },
        source: { kind: "search", label: privateLabel },
        lastLoadedAt: "",
        lastRefreshedAt: "",
        privacyOn: true,
      });

      const serialized = JSON.stringify(summary);
      expect(summary.freshnessState).toMatch(/empty|stale|partial|error|cancelled/);
      expect(summary.recoveryActions.length).toBeGreaterThan(0);
      expect(serialized).not.toContain("wxid_synthetic_private_path");
      expect(serialized).not.toContain("Synthetic Secret");
      expect(serialized).not.toMatch(/\/api\/v1\/graph/);
    }
  });
});

function status(overrides: Partial<GraphStatusView> = {}): GraphStatusView {
  return {
    state: "ready",
    enabled: true,
    paused: false,
    running: false,
    counts: { entities: 3, relations: 2, events: 1, facts: 4, sources: 5 },
    pending: 0,
    processing: 0,
    processed: 10,
    failed: 0,
    progressPct: 100,
    lastError: "",
    historyQueued: false,
    enqueueRunning: false,
    workers: 1,
    enqueueWorkers: 1,
    startedAt: "",
    processingRatePerMinute: 45,
    estimatedSecondsLeft: 60,
    lastUpdatedAt: "2026-01-02T03:04:00.000Z",
    queueLabel: "历史未入队 / 0 处理中",
    workerLabel: "1 图谱线程 / 1 入队线程",
    etaLabel: "约 1 分钟",
    rateLabel: "45/min",
    ...overrides,
  };
}

function visualize(): GraphVisualizeView {
  return {
    state: "loaded",
    nodes: [
      { id: "a", name: "A", label: "A", kind: "person", value: 2, last_seen: 1 },
      { id: "b", name: "B", label: "B", kind: "topic", value: 1, last_seen: 1 },
      { id: "c", name: "C", label: "C", kind: "event", value: 1, last_seen: 1 },
    ],
    edges: [
      { id: "e1", source: "a", target: "b", label: "mentions", status: "active", confidence: 1, last_seen: 1, evidence_count: 2 },
      { id: "e2", source: "b", target: "c", label: "causes", status: "active", confidence: 1, last_seen: 1, evidence_count: 1 },
    ],
    timelineRows: [{ time: 1767326400, type: "event", title: "Event", description: "Detail", source: "source" }],
    generatedAt: 1767326400,
    error: "",
    summary: { nodeCount: 3, edgeCount: 2, timelineCount: 1 },
  };
}

function emptyVisualize(): GraphVisualizeView {
  return {
    ...visualize(),
    state: "empty",
    nodes: [],
    edges: [],
    timelineRows: [],
    summary: { nodeCount: 0, edgeCount: 0, timelineCount: 0 },
  };
}
