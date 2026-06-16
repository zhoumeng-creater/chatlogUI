import { beforeEach, describe, expect, it } from "vitest";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import {
  recordErrorRecoveryKpiEvent,
  recordExportKpiEvent,
  recordGraphVisualizationKpiEvent,
  recordQaKpiEvent,
  recordSearchExecutedKpiEvent,
  recordSearchFilterChangedKpiEvent,
  recordSearchResultOpenedKpiEvent,
  recordSetupCompletedKpiEvent,
} from "./uxKpiEvents";

describe("uxKpiFlowEvents", () => {
  beforeEach(() => {
    useDiagnosticEventStore.setState({
      items: [],
      filters: {
        source: "all",
        level: "all",
        privacy: "all",
        endpointFamily: "all",
        failedOnly: false,
        timeRange: "all",
      },
    });
  });

  it("records setup, search, and result-open KPI flow events", () => {
    recordSetupCompletedKpiEvent({
      mode: "managed",
      httpReady: true,
      dbReady: true,
      durationMs: 101,
      outcome: "success",
    });
    recordSearchExecutedKpiEvent({
      resultCount: 3,
      filterCount: 1,
      scopeKind: "all",
      durationMs: 52,
      outcome: "success",
    });
    recordSearchFilterChangedKpiEvent({
      filterCount: 2,
      scopeKind: "current",
    });
    recordSearchResultOpenedKpiEvent({
      rankBucket: "top-10",
      scopeKind: "current",
      hasAnchor: true,
      outcome: "success",
    });

    expect(useDiagnosticEventStore.getState().items.map((event) => event.category)).toEqual([
      "ux.setup.completed",
      "ux.search.executed",
      "ux.search.filter_changed",
      "ux.search.result_opened",
    ]);
  });

  it("records export, QA, and graph KPI flow events without private payloads", () => {
    recordExportKpiEvent({
      sourceModule: "ai",
      format: "markdown",
      rowCount: 4,
      redactionPolicy: "redacted",
      durationMs: 40,
      outcome: "success",
    });
    recordQaKpiEvent({
      evidenceCount: 2,
      sourceCount: 5,
      durationMs: 900,
      scopeKind: "current",
      answerLengthBucket: "short",
      outcome: "success",
    });
    recordGraphVisualizationKpiEvent({
      nodeCount: 12,
      edgeCount: 20,
      durationMs: 144,
      layout: "force",
      graphType: "3d",
      cached: false,
      outcome: "success",
    });

    const items = useDiagnosticEventStore.getState().items;
    expect(items.map((event) => event.category)).toEqual([
      "ux.export.completed",
      "ux.semantic.qa_completed",
      "ux.graph.visualization_opened",
    ]);
    expect(JSON.stringify(items)).not.toContain("Synthetic private prompt");
    expect(JSON.stringify(items)).not.toContain("Synthetic private answer");
    expect(JSON.stringify(items)).not.toContain("Synthetic private query");
    expect(JSON.stringify(items)).not.toContain("C:\\");
  });

  it("keeps all planned flow categories represented by local recorders", () => {
    const categories = useDiagnosticEventStore.getState().items.map((event) => event.category);

    expect(categories).toEqual([]);

    recordSetupCompletedKpiEvent({
      mode: "external",
      httpReady: true,
      dbReady: true,
      durationMs: 1,
      outcome: "success",
    });
    recordSearchExecutedKpiEvent({
      resultCount: 1,
      filterCount: 1,
      scopeKind: "current",
      durationMs: 1,
      outcome: "success",
    });
    recordSearchFilterChangedKpiEvent({ filterCount: 1, scopeKind: "current" });
    recordSearchResultOpenedKpiEvent({
      rankBucket: "top-10",
      scopeKind: "current",
      hasAnchor: true,
      outcome: "success",
    });
    recordErrorRecoveryKpiEvent({
      sourceModule: "search",
      recoveryAction: "retry",
      outcome: "success",
    });
    recordExportKpiEvent({
      sourceModule: "search",
      format: "csv",
      rowCount: 1,
      redactionPolicy: "redacted",
      durationMs: 1,
      outcome: "cancelled",
    });
    recordQaKpiEvent({
      evidenceCount: 0,
      sourceCount: 0,
      durationMs: 1,
      scopeKind: "all",
      answerLengthBucket: "empty",
      outcome: "stopped",
    });
    recordGraphVisualizationKpiEvent({
      nodeCount: 0,
      edgeCount: 0,
      durationMs: 1,
      layout: "force",
      graphType: "3d",
      cached: false,
      outcome: "failed",
    });

    expect(useDiagnosticEventStore.getState().items.map((event) => event.category)).toEqual([
      "ux.setup.completed",
      "ux.search.executed",
      "ux.search.filter_changed",
      "ux.search.result_opened",
      "ux.error.recovery_clicked",
      "ux.export.cancelled",
      "ux.semantic.qa_stopped",
      "ux.graph.visualization_opened",
    ]);
  });
});
