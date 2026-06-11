import { afterEach, describe, expect, it, vi } from "vitest";
import { SSE_TIMEOUT_MS } from "@/utils/constants";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { streamQA } from "./streamQA";
import type { SemanticStreamEvent } from "./semanticStreamParser";

afterEach(() => {
  vi.useRealTimers();
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
              controller.enqueue(encoder.encode('lo"}\n\nevent: done\ndata: {"answer":"hello","evidence":[],"reason":"done","source_count":2,"window":"7d","depth":"standard","count":0,"rerank_tried":true,"rerank_applied":true}\n\n'));
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
          chat: "wxid_synthetic_a",
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
      chat: "wxid_synthetic_a",
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
          metadata: {
            sourceCount: 2,
            window: "7d",
            depth: "standard",
            evidenceCount: 0,
            rerankTried: true,
            rerankApplied: true,
          },
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

  it("reports SSE timeout aborts as retryable semantic timeout errors", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
      ),
    );

    streamQA({ query: "Timeout" }, vi.fn(), onError);

    await vi.advanceTimersByTimeAsync(60_000);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "ESEMANTIC_TIMEOUT",
    });
  });

  it("keeps the SSE idle watchdog active after headers while waiting for body chunks", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start() {
              // Keep the body open without emitting a chunk.
            },
          }),
          { status: 200 },
        ),
      ),
    );

    streamQA({ query: "Headers returned then stalled" }, vi.fn(), onError);

    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(SSE_TIMEOUT_MS);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "ESEMANTIC_TIMEOUT",
    });
  });

  it("resets the SSE idle watchdog whenever body chunks arrive", async () => {
    vi.useFakeTimers();
    const events: SemanticStreamEvent[] = [];
    const onError = vi.fn();
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const encoder = new TextEncoder();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              streamController = controller;
              controller.enqueue(encoder.encode('event: delta\ndata: {"text":"one"}\n\n'));
            },
          }),
          { status: 200 },
        ),
      ),
    );

    streamQA(
      { query: "Chunk reset" },
      (event) => events.push(event),
      onError,
    );

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual([{ type: "delta", text: "one" }]);

    await vi.advanceTimersByTimeAsync(SSE_TIMEOUT_MS / 2);
    (streamController as unknown as ReadableStreamDefaultController<Uint8Array>).enqueue(
      encoder.encode('event: delta\ndata: {"text":"two"}\n\n'),
    );
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toEqual([
      { type: "delta", text: "one" },
      { type: "delta", text: "two" },
    ]);
    expect(onError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SSE_TIMEOUT_MS - 1);
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "ESEMANTIC_TIMEOUT",
    });
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
