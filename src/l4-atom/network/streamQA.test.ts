import { afterEach, describe, expect, it, vi } from "vitest";
import { streamQA } from "./streamQA";
import type { DiagnosticEvent } from "./diagnosticEvents";
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

  it("emits safe stream lifecycle diagnostics without token or prompt payloads", async () => {
    const diagnosticEvents: DiagnosticEvent[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode('event: delta\ndata: {"text":"private token"}\n\n'));
              controller.enqueue(encoder.encode('event: done\ndata: {"answer":"private answer","evidence":[{"chat":"wxid_private"}],"reason":"done"}\n\n'));
              controller.close();
            },
          }),
          { status: 200 },
        )
      ),
    );

    await new Promise<void>((resolve, reject) => {
      streamQA(
        { query: "private question", chat: "wxid_private" },
        (event) => {
          if (event.type === "done") resolve();
        },
        reject,
        undefined,
        {
          diagnostics: {
            correlationId: "qa-stream",
            recoveryHint: "retry",
          },
          onDiagnosticEvent: (event) => diagnosticEvents.push(event),
        },
      );
    });

    expect(diagnosticEvents.map((event) => event.category)).toEqual([
      "http.stream.start",
      "http.stream.done",
    ]);
    expect(diagnosticEvents.map((event) => event.attributes?.endpointFamily)).toEqual([
      "semantic-qa-stream",
      "semantic-qa-stream",
    ]);
    expect(JSON.stringify(diagnosticEvents)).not.toContain("private question");
    expect(JSON.stringify(diagnosticEvents)).not.toContain("private token");
    expect(JSON.stringify(diagnosticEvents)).not.toContain("private answer");
    expect(JSON.stringify(diagnosticEvents)).not.toContain("wxid_private");
  });
});
