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
    timestamp: "2026-06-01T00:00:00.000Z",
    source: "http",
    level: "warn",
    privacy: "safe",
    category: "http.error",
    summary: "GET db failed with HTTP 503",
    correlationId: "db-refresh",
    recoveryHint: "check-service",
    attributes: {
      endpointFamily: "db",
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
      recoveryHint: "privacy-blocked",
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
    expect(view.endpointOptions.map((option) => option.value)).toContain("db");
    expect(view.rows.find((row) => row.id === "http-1")?.detailRows).toEqual(
      expect.arrayContaining([
        { label: "Endpoint", value: "db" },
        { label: "Status", value: "503" },
        { label: "Recovery", value: "检查服务状态" },
        { label: "Correlation", value: "db-refresh" },
      ]),
    );
  });

  it("filters rows by source, level, privacy, endpoint, failure state, and time range", () => {
    const view = buildDiagnosticEventViewModel({
      logs,
      events,
      filters: {
        source: "http",
        level: "warn",
        privacy: "safe",
        endpointFamily: "db",
        failedOnly: true,
        timeRange: "last15m",
      },
      now: new Date("2026-06-01T00:10:00.000Z"),
    });

    expect(view.rows.map((row) => row.id)).toEqual(["http-1"]);
    expect(view.activeEmptyMessage).toBe("当前筛选条件下没有诊断事件。");
    expect(view.hasActiveFilters).toBe(true);
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
});
