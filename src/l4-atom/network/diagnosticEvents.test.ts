import { describe, expect, it } from "vitest";
import {
  createDiagnosticEvent,
  createHttpDiagnosticEvent,
  limitDiagnosticEvents,
  sanitizeDiagnosticAttributes,
  serializeDiagnosticEvents,
} from "./diagnosticEvents";

const testOptions = {
  now: () => "2026-06-01T00:00:00.000Z",
  nextId: () => "diagnostic-test-id",
};

describe("diagnosticEvents", () => {
  it("creates a safe HTTP success event without raw query details", () => {
    const event = createHttpDiagnosticEvent(
      {
        url: "http://127.0.0.1:5030/api/v1/db?dataKey=raw-secret&format=json",
        method: "GET",
        status: 200,
        durationMs: 24,
        endpointFamily: "db",
        correlationId: "db-refresh-1",
        recoveryHint: "retry",
      },
      testOptions,
    );

    expect(event).toMatchObject({
      id: "diagnostic-test-id",
      timestamp: "2026-06-01T00:00:00.000Z",
      source: "http",
      level: "info",
      privacy: "safe",
      category: "http.request",
      correlationId: "db-refresh-1",
      recoveryHint: "retry",
      summary: "GET db completed with HTTP 200",
      attributes: {
        endpointFamily: "db",
        method: "GET",
        status: 200,
        durationMs: 24,
      },
    });
    expect(JSON.stringify(event)).not.toContain("raw-secret");
    expect(JSON.stringify(event)).not.toContain("dataKey");
  });

  it("redacts sensitive summaries and omits unsafe attributes", () => {
    const event = createDiagnosticEvent(
      {
        source: "http",
        level: "error",
        category: "http.error",
        summary:
          "request failed data_key=raw-secret token=raw-token C:\\Users\\Alice\\WeChat Files\\wxid_private",
        attributes: {
          endpointFamily: "media",
          responseBody: "private response body",
          url: "http://127.0.0.1:5030/image/raw-media-key",
          status: 500,
        },
      },
      testOptions,
    );

    expect(event.privacy).toBe("redacted");
    expect(event.summary).not.toContain("raw-secret");
    expect(event.summary).not.toContain("raw-token");
    expect(event.summary).not.toContain("Alice");
    expect(event.summary).not.toContain("wxid_private");
    expect(event.attributes).toEqual({
      endpointFamily: "media",
      status: 500,
    });
  });

  it("serializes blocked events without leaking the blocked summary", () => {
    const event = createDiagnosticEvent(
      {
        source: "ui",
        level: "error",
        privacy: "blocked",
        category: "diagnostic.export",
        summary: "Synthetic private message for redaction test only",
      },
      testOptions,
    );

    const serialized = serializeDiagnosticEvents([event]);

    expect(serialized).toContain("[blocked diagnostic event]");
    expect(serialized).not.toContain("Synthetic private message");
  });

  it("keeps only the newest events when retention is limited", () => {
    const events = ["a", "b", "c"].map((id) =>
      createDiagnosticEvent(
        {
          source: "ui",
          level: "info",
          category: "test",
          summary: `event ${id}`,
        },
        {
          now: () => "2026-06-01T00:00:00.000Z",
          nextId: () => id,
        },
      ),
    );

    expect(limitDiagnosticEvents(events, 2).map((event) => event.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("keeps only whitelisted diagnostic attributes", () => {
    expect(
      sanitizeDiagnosticAttributes({
        endpointFamily: "sns",
        method: "GET",
        status: 503,
        retryable: true,
        rawUrl: "http://127.0.0.1:5030/api/v1/sns/media/proxy?url=secret",
        requestBody: "private request",
      }),
    ).toEqual({
      endpointFamily: "sns",
      method: "GET",
      status: 503,
      retryable: true,
    });
  });

  it("normalizes unsafe recovery metadata instead of persisting private values", () => {
    const event = createDiagnosticEvent(
      {
        source: "ui",
        level: "warn",
        category: "diagnostic.metadata",
        summary: "metadata test",
        correlationId: "unsafe private id with spaces",
        recoveryHint: "open-raw-secret" as never,
      },
      testOptions,
    );

    expect(event.correlationId).toBeUndefined();
    expect(event.recoveryHint).toBe("none");
  });
});
