import { beforeEach, describe, expect, it } from "vitest";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import {
  buildErrorRecoveryKpiAttrs,
  buildExportKpiAttrs,
  buildGraphVisualizationKpiAttrs,
  buildQaKpiAttrs,
  buildSearchExecutedKpiAttrs,
  buildSetupCompletedKpiAttrs,
  createUxKpiEvent,
  createUxKpiTimer,
  recordErrorRecoveryKpiEvent,
  recordUxKpiEvent,
} from "./uxKpiEvents";

describe("uxKpiEvents", () => {
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

  it("creates local-only UX KPI events with controlled categories and attributes", () => {
    const event = createUxKpiEvent(
      {
        module: "search",
        task: "executed",
        outcome: "success",
        attributes: buildSearchExecutedKpiAttrs({
          resultCount: 8,
          filterCount: 2,
          scopeKind: "current",
          durationMs: 42,
          outcome: "success",
        }),
      },
      {
        now: () => "2026-06-15T00:00:00.000Z",
        nextId: () => "ux-test-id",
      },
    );

    expect(event).toMatchObject({
      id: "ux-test-id",
      source: "ux",
      category: "ux.search.executed",
      level: "info",
      privacy: "safe",
      summary: "UX KPI search.executed success",
      attributes: {
        module: "search",
        task: "executed",
        outcome: "success",
        resultCount: 8,
        filterCount: 2,
        scopeKind: "current",
        durationMs: 42,
      },
    });
  });

  it("drops private free-text payloads before events enter diagnostics state", () => {
    const event = createUxKpiEvent({
      module: "semantic",
      task: "qa_completed",
      outcome: "success",
      attributes: {
        ...buildQaKpiAttrs({
          evidenceCount: 3,
          sourceCount: 5,
          durationMs: 1200,
          scopeKind: "current",
          answerLengthBucket: "medium",
          outcome: "success",
        }),
        query: "Synthetic private search query",
        prompt: "Synthetic private prompt",
        answer: "Synthetic private answer",
        path: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private",
        dataKey: "synthetic-data-key",
        imgKey: "synthetic-img-key",
        token: "synthetic-token",
        contactName: "Synthetic Contact",
        chatRoomName: "Synthetic Chat Room",
        rawUrl: "http://127.0.0.1:5030/api/v1/search?keyword=private",
      },
    });

    const serialized = JSON.stringify(event);
    expect(event.privacy).toBe("redacted");
    expect(event.attributes).toEqual({
      module: "semantic",
      task: "qa_completed",
      outcome: "success",
      evidenceCount: 3,
      sourceCount: 5,
      durationMs: 1200,
      scopeKind: "current",
      answerLengthBucket: "medium",
    });
    for (const privateMarker of [
      "Synthetic private",
      "wxid_synthetic_private",
      "dataKey",
      "imgKey",
      "synthetic-token",
      "Contact",
      "Chat Room",
      "keyword=private",
    ]) {
      expect(serialized).not.toContain(privateMarker);
    }
  });

  it("normalizes setup, export, QA, and graph flow attributes", () => {
    expect(
      buildSetupCompletedKpiAttrs({
        mode: "external",
        httpReady: true,
        dbReady: true,
        durationMs: 88,
        outcome: "success",
      }),
    ).toEqual({
      module: "setup",
      task: "completed",
      outcome: "success",
      mode: "external",
      httpReady: true,
      dbReady: true,
      durationMs: 88,
    });

    expect(
      buildExportKpiAttrs({
        sourceModule: "graph",
        format: "csv",
        rowCount: 12,
        redactionPolicy: "redacted",
        durationMs: 64,
        outcome: "success",
      }),
    ).toMatchObject({
      module: "export",
      task: "completed",
      outcome: "success",
      sourceModule: "graph",
      format: "csv",
      rowCount: 12,
      redactionPolicy: "redacted",
      durationMs: 64,
    });

    expect(
      buildGraphVisualizationKpiAttrs({
        nodeCount: 7,
        edgeCount: 9,
        durationMs: 31,
        layout: "force",
        graphType: "3d",
        cached: true,
        outcome: "success",
      }),
    ).toEqual({
      module: "graph",
      task: "visualization_opened",
      outcome: "success",
      nodeCount: 7,
      edgeCount: 9,
      durationMs: 31,
      layout: "force",
      graphType: "3d",
      cached: true,
    });
  });

  it("records UX KPI events through the L2 diagnostics store only", () => {
    const event = recordUxKpiEvent({
      module: "error",
      task: "recovery_clicked",
      outcome: "success",
      attributes: {
        module: "error",
        task: "recovery_clicked",
        outcome: "success",
        recoveryAction: "retry",
      },
    });

    expect(useDiagnosticEventStore.getState().items).toEqual([event]);
    expect(event.source).toBe("ux");
    expect(event.category).toBe("ux.error.recovery_clicked");
  });

  it("builds and records error recovery clicks without accepting free-form recovery labels", () => {
    expect(
      buildErrorRecoveryKpiAttrs({
        sourceModule: "update",
        recoveryAction: "open-settings",
        outcome: "success",
      }),
    ).toEqual({
      module: "error",
      task: "recovery_clicked",
      outcome: "success",
      sourceModule: "update",
      recoveryAction: "open-settings",
    });

    const event = recordErrorRecoveryKpiEvent({
      sourceModule: "Synthetic private module" as never,
      recoveryAction: "open-raw-secret" as never,
      outcome: "success",
    });

    expect(event.category).toBe("ux.error.recovery_clicked");
    expect(event.attributes).toMatchObject({
      module: "error",
      task: "recovery_clicked",
      outcome: "success",
      sourceModule: "unknown",
      recoveryAction: "unknown",
    });
    expect(JSON.stringify(event)).not.toContain("Synthetic private module");
    expect(JSON.stringify(event)).not.toContain("open-raw-secret");
  });

  it("creates timers that report rounded local durations without browser marks", () => {
    let now = 1000;
    const timer = createUxKpiTimer(() => now);
    now = 1432.4;

    expect(timer.durationMs()).toBe(432);
  });
});
