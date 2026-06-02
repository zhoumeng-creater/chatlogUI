import { describe, expect, it } from "vitest";
import type { LogEntry } from "@l2/data-clerk/stores/useDevConsoleStore";
import type { DiagnosticEvent } from "@l4/network/diagnosticEvents";
import {
  buildDiagnosticEventViewModel,
  summarizeDiagnosticEventsForReport,
} from "./diagnosticEventViewModel";

const logs: LogEntry[] = [
  {
    id: 1,
    time: "10:00:00",
    level: "stdout",
    message: "sidecar ready",
  },
  {
    id: 2,
    time: "10:00:01",
    level: "stderr",
    message: "data_key=****** failed",
  },
];

const events: DiagnosticEvent[] = [
  {
    id: "http-1",
    timestamp: "2026-06-01T00:20:00.000Z",
    source: "http",
    level: "warn",
    privacy: "safe",
    category: "http.error",
    summary: "GET db failed with HTTP 503",
    correlationId: "db-refresh",
    recoveryHint: "check-service",
    attributes: {
      endpointFamily: "db",
      method: "GET",
      status: 503,
      durationMs: 12,
    },
  },
  {
    id: "ui-1",
    timestamp: "2026-06-01T00:00:01.000Z",
    source: "ui",
    level: "error",
    privacy: "blocked",
    category: "diagnostic.export",
    summary: "[blocked diagnostic event]",
  },
];

describe("diagnosticEventViewModel", () => {
  it("combines sidecar logs and diagnostic events with counts", () => {
    const view = buildDiagnosticEventViewModel({
      logs,
      events,
      filters: {
        source: "all",
        level: "all",
        privacy: "all",
        endpointFamily: "all",
        failedOnly: false,
        timeRange: "all",
      },
    });

    expect(view.rows).toHaveLength(4);
    expect(view.counts).toEqual({
      total: 4,
      sidecarLogs: 2,
      diagnosticEvents: 2,
      warningsOrErrors: 3,
      redactedOrBlocked: 1,
    });
    expect(view.emptyMessage).toBe("暂无诊断事件或 Sidecar 日志。");
  });

  it("filters rows by source, level, and privacy", () => {
    const view = buildDiagnosticEventViewModel({
      logs,
      events,
      filters: {
        source: "http",
        level: "warn",
        privacy: "safe",
        endpointFamily: "all",
        failedOnly: false,
        timeRange: "all",
      },
    });

    expect(view.rows.map((row) => row.id)).toEqual(["http-1"]);
    expect(view.activeEmptyMessage).toBe("当前筛选条件下没有诊断事件。");
  });

  it("summarizes events for diagnostics export without private payloads", () => {
    const summary = summarizeDiagnosticEventsForReport(events);

    expect(summary).toEqual({
      total: 2,
      warningsOrErrors: 2,
      redactedOrBlocked: 1,
      sources: "http, ui",
      levels: "error: 1, warn: 1",
      privacyStates: "blocked: 1, safe: 1",
      endpointFamilies: "db: 1, ui: 1",
      latestSummary: "[blocked diagnostic event]",
    });
  });

  it("filters by endpoint, failed-only, and time range", () => {
    const view = buildDiagnosticEventViewModel({
      logs,
      events,
      filters: {
        source: "all",
        level: "all",
        privacy: "all",
        endpointFamily: "db",
        failedOnly: true,
        timeRange: "last15m",
      },
      now: new Date("2026-06-01T00:25:00.000Z"),
    });

    expect(view.rows.map((row) => row.id)).toEqual(["http-1"]);
    expect(view.endpointOptions).toEqual([
      { value: "all", label: "全部端点" },
      { value: "db", label: "db" },
      { value: "sidecar", label: "sidecar" },
      { value: "ui", label: "ui" },
    ]);
    expect(view.hasActiveFilters).toBe(true);
  });

  it("builds screenshot-safe detail rows with recovery hints", () => {
    const view = buildDiagnosticEventViewModel({
      logs: [],
      events,
      filters: {
        source: "all",
        level: "all",
        privacy: "all",
        endpointFamily: "all",
        failedOnly: false,
        timeRange: "all",
      },
    });

    const [row] = view.rows;
    expect(row).toMatchObject({
      id: "http-1",
      endpointFamily: "db",
      statusLabel: "503",
      durationLabel: "12 ms",
      recoveryLabel: "检查服务状态",
      isFailed: true,
    });
    expect(row.detailRows).toContainEqual({ label: "Correlation", value: "db-refresh" });
    expect(JSON.stringify(row.detailRows)).not.toContain("dataKey");
  });
});
