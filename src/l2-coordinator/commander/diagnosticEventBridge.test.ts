import { beforeEach, describe, expect, it } from "vitest";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";
import {
  createDiagnosticHttpOptions,
  recordLocalDiagnosticEvent,
  recordReleaseDiagnosticEvent,
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
      correlationId: "search-1",
      recoveryHint: "retry",
    });

    options.onDiagnosticEvent?.({
      id: "http-1",
      timestamp: "2026-06-01T00:00:00.000Z",
      source: "http",
      level: "warn",
      privacy: "safe",
      category: "http.error",
      summary: "GET search failed with HTTP 503",
      correlationId: "search-1",
      recoveryHint: "retry",
      attributes: {
        endpointFamily: "search",
        method: "GET",
        status: 503,
      },
    });

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
      },
    });
  });

  it("records local events after redacting unsafe summaries", () => {
    recordLocalDiagnosticEvent({
      source: "ui",
      level: "error",
      category: "diagnostic.export",
      summary: "Export failed token=raw-export-token",
      recoveryHint: "privacy-blocked",
    });

    const [event] = useDiagnosticEventStore.getState().items;
    expect(event).toMatchObject({
      source: "ui",
      level: "error",
      category: "diagnostic.export",
      recoveryHint: "privacy-blocked",
      privacy: "redacted",
    });
    expect(JSON.stringify(event)).not.toContain("raw-export-token");
  });

  it("records Tauri failures through the same redaction path", () => {
    recordLocalDiagnosticEvent({
      source: "tauri",
      level: "error",
      category: "tauri.diagnostics.export.failed",
      summary: "Export failed dataKey=raw-tauri-key",
      recoveryHint: "privacy-blocked",
    });

    const [event] = useDiagnosticEventStore.getState().items;
    expect(event).toMatchObject({
      source: "tauri",
      level: "error",
      category: "tauri.diagnostics.export.failed",
      recoveryHint: "privacy-blocked",
      privacy: "redacted",
    });
    expect(JSON.stringify(event)).not.toContain("raw-tauri-key");
  });

  it("records release smoke summaries without leaking artifact paths or secrets", () => {
    recordReleaseDiagnosticEvent({
      level: "warn",
      category: "release.smoke.privacy-audit",
      summary: "Release smoke failed at C:\\Users\\Alice\\WeChat Files\\wxid_private token=raw-release-token",
      releaseGate: "windows-x64-smoke",
      recoveryHint: "privacy-blocked",
    });

    const [event] = useDiagnosticEventStore.getState().items;
    expect(event).toMatchObject({
      source: "release",
      level: "warn",
      category: "release.smoke.privacy-audit",
      privacy: "redacted",
      recoveryHint: "privacy-blocked",
      attributes: {
        releaseGate: "windows-x64-smoke",
      },
    });
    expect(JSON.stringify(event)).not.toContain("Alice");
    expect(JSON.stringify(event)).not.toContain("wxid_private");
    expect(JSON.stringify(event)).not.toContain("raw-release-token");
  });
});
