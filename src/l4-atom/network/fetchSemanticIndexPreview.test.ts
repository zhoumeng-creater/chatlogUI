import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchSemanticIndexPreview } from "./fetchSemanticIndexPreview";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSemanticIndexPreview", () => {
  it("calls semantic preview with JSON format and safe query params", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return new Response(JSON.stringify({
          model: "synthetic-embedding-model",
          dim: 768,
          kind: "message",
          limit: 10,
          offset: 20,
          total: 0,
          groups: [],
          items: [],
          store_path: "synthetic-vector-store-redaction-target",
          sample_dims: 3,
          outliers: [],
        }), { status: 200 });
      }),
    );

    await expect(fetchSemanticIndexPreview({
      kind: "message",
      talker: "synthetic_talker_alpha",
      limit: 10,
      offset: 20,
    })).resolves.toMatchObject({
      kind: "message",
      limit: 10,
      offset: 20,
      total: 0,
    });

    const url = new URL(urls[0]);
    expect(url.pathname).toBe("/api/v1/semantic/index/preview");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("kind")).toBe("message");
    expect(url.searchParams.get("talker")).toBe("synthetic_talker_alpha");
  });

  it("emits diagnostics without talker, store path, content, or vector samples", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({
          total: 1,
          items: [{ content: "Synthetic private semantic content", vector_sample: [0.1] }],
          store_path: "synthetic-vector-store-redaction-target",
        }), { status: 200 }),
      ),
    );

    await fetchSemanticIndexPreview(
      { kind: "all", talker: "synthetic_talker_alpha" },
      {
        diagnostics: {
          endpointFamily: "semantic_preview",
          correlationId: "p4e-semantic",
          recoveryHint: "retry",
        },
        onDiagnosticEvent: (event) => events.push(event),
      },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      attributes: {
        endpointFamily: "semantic_preview",
        method: "GET",
        status: 200,
      },
    });
    expect(JSON.stringify(events[0])).not.toContain("synthetic_talker");
    expect(JSON.stringify(events[0])).not.toContain("store");
    expect(JSON.stringify(events[0])).not.toContain("private");
    expect(JSON.stringify(events[0])).not.toContain("vector");
  });
});
