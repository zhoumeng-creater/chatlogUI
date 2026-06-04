import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { streamQA } from "./streamQA";
import type { SemanticStreamEvent } from "./semanticStreamParser";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("streamQA", () => {
  it("posts the backend QA payload and emits named stream events", async () => {
    const events: SemanticStreamEvent[] = [];
    let capturedBody: unknown = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(String(init?.body));
        return new Response(
          new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode('event: delta\ndata: {"text":"hel'));
              controller.enqueue(encoder.encode('lo"}\n\nevent: done\ndata: {"answer":"hello","evidence":[],"reason":"done"}\n\n'));
              controller.close();
            },
          }),
          { status: 200 },
        );
      }),
    );

    await new Promise<void>((resolve, reject) => {
      streamQA(
        {
          query: "What changed?",
          chat: "wxid_a",
          scope: "contact",
          retrievalDepth: "deep",
          sourceLimit: 4,
        },
        (event) => {
          events.push(event);
          if (event.type === "done") resolve();
        },
        reject,
      );
    });

    expect(capturedBody).toEqual({
      query: "What changed?",
      chat: "wxid_a",
      retrieval_depth: "deep",
      source_limit: 4,
    });
    expect(events).toEqual([
      { type: "delta", text: "hello" },
      {
        type: "done",
        payload: {
          answer: "hello",
          evidence: [],
          reason: "done",
          metadata: {},
          sourceCount: 0,
          window: "",
          depth: "",
          rerankTried: false,
          rerankApplied: false,
          rerankError: "",
        },
      },
    ]);
  });

  it("does not report aborted streams as failures", async () => {
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      }),
    );

    const controller = new AbortController();
    controller.abort();

    streamQA({ query: "Stop" }, vi.fn(), onError, controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).not.toHaveBeenCalled();
  });

  it("emits a redacted stream diagnostic event when diagnostics are supplied", async () => {
    const diagnosticEvents: DiagnosticEvent[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
          { status: 200 },
        ),
      ),
    );

    streamQA(
      { query: "Synthetic private message for redaction test only", chat: "wxid_synthetic_redaction_case" },
      vi.fn(),
      vi.fn(),
      undefined,
      {
        diagnostics: { endpointFamily: "semantic", recoveryHint: "retry" },
        onDiagnosticEvent: (event) => diagnosticEvents.push(event),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(diagnosticEvents).toHaveLength(1);
    expect(diagnosticEvents[0]).toMatchObject({
      source: "http",
      category: "http.request",
      attributes: { endpointFamily: "semantic", method: "POST" },
    });
    expect(JSON.stringify(diagnosticEvents[0])).not.toContain("Synthetic private message");
    expect(JSON.stringify(diagnosticEvents[0])).not.toContain("wxid_synthetic");
  });
});
