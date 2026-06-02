import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchHealth } from "./readiness";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readiness fetchers", () => {
  it("accepts bare host:port service addresses from chatlog config summaries", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }),
    );

    await expect(fetchHealth("127.0.0.1:5030")).resolves.toBe(true);
    expect(capturedUrl).toBe("http://127.0.0.1:5030/health?format=json");
  });

  it("emits a health diagnostic event when diagnostics are supplied", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })),
    );

    await expect(
      fetchHealth("127.0.0.1:5030", {
        diagnostics: { endpointFamily: "health", recoveryHint: "check-service" },
        onDiagnosticEvent: (event) => events.push(event),
      }),
    ).resolves.toBe(true);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      recoveryHint: "check-service",
      attributes: { endpointFamily: "health" },
    });
  });
});
