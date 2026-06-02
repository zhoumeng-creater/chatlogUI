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

  it("emits safe readiness diagnostic events without persisting full service URLs", async () => {
    const diagnosticEvents: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })),
    );

    await expect(
      fetchHealth("127.0.0.1:5030", {
        diagnostics: { correlationId: "setup-readiness", recoveryHint: "check-service" },
        onDiagnosticEvent: (event) => diagnosticEvents.push(event),
      }),
    ).resolves.toBe(true);

    expect(diagnosticEvents[0]).toMatchObject({
      source: "http",
      category: "http.request",
      correlationId: "setup-readiness",
      recoveryHint: "check-service",
      attributes: {
        endpointFamily: "health",
        method: "GET",
        status: 200,
      },
    });
    expect(JSON.stringify(diagnosticEvents[0])).not.toContain("127.0.0.1:5030");
  });
});
