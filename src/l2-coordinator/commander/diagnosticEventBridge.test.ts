import { beforeEach, describe, expect, it } from "vitest";
import { createHttpDiagnosticEvent } from "@l4/network/diagnosticEvents";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";
import {
  createDiagnosticEventSink,
  createDiagnosticHttpOptions,
  recordDiagnosticEvent,
} from "./diagnosticEventBridge";

describe("diagnosticEventBridge", () => {
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

  it("adds safe HTTP events to the diagnostic store", () => {
    const options = createDiagnosticHttpOptions({
      endpointFamily: "search",
      method: "GET",
      correlationId: "search-1",
      recoveryHint: "retry",
    });

    options.onDiagnosticEvent?.(
      createHttpDiagnosticEvent({
        url: "http://127.0.0.1:5030/api/v1/search?keyword=secret",
        status: 503,
        durationMs: 42,
        ...options.diagnostics,
      }),
    );

    const [event] = useDiagnosticEventStore.getState().items;
    expect(event).toMatchObject({
      source: "http",
      category: "http.error",
      correlationId: "search-1",
      recoveryHint: "retry",
      attributes: {
        endpointFamily: "search",
        method: "GET",
        status: 503,
        durationMs: 42,
      },
    });
    expect(JSON.stringify(event)).not.toContain("keyword=secret");
  });

  it("records local UI, Tauri, and updater events without L3 involvement", () => {
    const uiSink = createDiagnosticEventSink({
      source: "ui",
      category: "privacy.audit",
      recoveryHint: "privacy-blocked",
    });
    const tauriSink = createDiagnosticEventSink({
      source: "tauri",
      category: "window.material",
      recoveryHint: "none",
    });
    const updaterSink = createDiagnosticEventSink({
      source: "updater",
      category: "update.check",
      recoveryHint: "open-settings",
    });

    uiSink({ level: "warn", summary: "Blocked copy dataKey=raw-secret" });
    tauriSink({ level: "warn", summary: "Window material unavailable" });
    updaterSink({ level: "error", summary: "Update check failed token=raw-token" });

    expect(useDiagnosticEventStore.getState().items.map((event) => event.source)).toEqual([
      "ui",
      "tauri",
      "updater",
    ]);
    expect(JSON.stringify(useDiagnosticEventStore.getState().items)).not.toContain("raw-secret");
    expect(JSON.stringify(useDiagnosticEventStore.getState().items)).not.toContain("raw-token");
  });

  it("records already-created diagnostic events", () => {
    recordDiagnosticEvent(
      createHttpDiagnosticEvent({
        url: "http://127.0.0.1:5030/api/v1/db?dataKey=secret",
        endpointFamily: "db",
        status: 200,
      }),
    );

    expect(useDiagnosticEventStore.getState().items).toHaveLength(1);
    expect(JSON.stringify(useDiagnosticEventStore.getState().items[0])).not.toContain(
      "dataKey=secret",
    );
  });
});
