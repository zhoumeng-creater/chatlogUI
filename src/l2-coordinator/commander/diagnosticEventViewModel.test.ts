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
  },
];

describe("diagnosticEventViewModel", () => {
  it("combines sidecar logs and diagnostic events with counts", () => {
    const view = buildDiagnosticEventViewModel({
      logs,
      events,
      filters: { source: "all", level: "all", privacy: "all" },
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
      filters: { source: "http", level: "warn", privacy: "safe" },
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
      latestSummary: "[blocked diagnostic event]",
    });
  });
});
