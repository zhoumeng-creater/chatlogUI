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
          "request failed data_key=raw-secret token=raw-token C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private",
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
    expect(event.summary).not.toContain("wxid_synthetic_private");
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

  it("drops generic source and target attributes because callers can misuse them for private identities", () => {
    const event = createDiagnosticEvent(
      {
        source: "ui",
        level: "warn",
        category: "p3e.privacy",
        summary: "Graph diagnostic attribute audit",
        attributes: {
          endpointFamily: "graph",
          source: "Synthetic graph entity for redaction tests only",
          target: "Synthetic semantic contact for redaction tests only",
          status: 200,
        },
      },
      testOptions,
    );

    expect(event.attributes).toEqual({
      endpointFamily: "graph",
      status: 200,
    });
    expect(JSON.stringify(event)).not.toContain("Synthetic graph entity");
    expect(JSON.stringify(event)).not.toContain("Synthetic semantic contact");
  });

  it("keeps safe correlation and recovery metadata on HTTP events", () => {
    const event = createHttpDiagnosticEvent(
      {
        url: "http://127.0.0.1:5030/api/v1/search?keyword=secret",
        method: "GET",
        status: 503,
        durationMs: 64,
        endpointFamily: "search",
        correlationId: "search-2026-06-02",
        recoveryHint: "retry",
      },
      testOptions,
    );

    expect(event.correlationId).toBe("search-2026-06-02");
    expect(event.recoveryHint).toBe("retry");
    expect(JSON.stringify(event)).not.toContain("keyword=secret");
  });

  it("omits unsafe diagnostic attributes before they enter L2 state", () => {
    const event = createDiagnosticEvent(
      {
        source: "http",
        level: "warn",
        category: "http.error",
        summary: "GET db failed",
        attributes: {
          endpointFamily: "db",
          url: "http://127.0.0.1:5030/api/v1/db/query?sql=select * from MSG",
          query: "keyword=Synthetic private message for redaction test only",
          requestBody: "dataKey=synthetic-data-key-redaction-case",
          responseBody: "wxid_synthetic_redaction_case",
          sql: "select * from MSG",
          mediaKey: "image_synthetic_secret_key",
          snsProxyUrl: "/api/v1/sns/media/proxy?url=secret&key=private",
          status: 503,
        },
      },
      testOptions,
    );

    expect(event.attributes).toEqual({
      endpointFamily: "db",
      status: 503,
    });
    expect(JSON.stringify(event)).not.toContain("select * from MSG");
    expect(JSON.stringify(event)).not.toContain("Synthetic private message");
    expect(JSON.stringify(event)).not.toContain("synthetic-data-key");
    expect(JSON.stringify(event)).not.toContain("wxid_synthetic");
    expect(JSON.stringify(event)).not.toContain("image_synthetic_secret_key");
    expect(JSON.stringify(event)).not.toContain("sns/media/proxy");
  });

  it("falls back to no recovery hint when an unsafe hint is supplied", () => {
    const event = createDiagnosticEvent(
      {
        source: "ui",
        level: "warn",
        category: "privacy.audit",
        summary: "privacy audit blocked unsafe copy",
        recoveryHint: "open-raw-secret" as never,
      },
      testOptions,
    );

    expect(event.recoveryHint).toBe("none");
  });
});
