import { describe, expect, it, vi, afterEach } from "vitest";
import { requestJson, ChatlogHttpError, withRequestDiagnostics } from "./httpClient";
import type { DiagnosticEvent } from "./diagnosticEvents";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestJson", () => {
  it("appends format=json to chatlog API requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toContain("format=json");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );

    await expect(
      requestJson("http://127.0.0.1:5030/api/v1/db"),
    ).resolves.toEqual({ ok: true });
  });

  it("preserves HTTP status and response body on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("db not ready", { status: 503 })),
    );

    await expect(
      requestJson("http://127.0.0.1:5030/api/v1/db"),
    ).rejects.toMatchObject({
      name: "ChatlogHttpError",
      status: 503,
      body: "db not ready",
    } satisfies Partial<ChatlogHttpError>);
  });

  it("does not duplicate format=json if already present", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response("{}", { status: 200 });
      }),
    );

    await requestJson("http://127.0.0.1:5030/api/v1/search?format=json");
    expect(capturedUrl.split("format=json").length).toBe(2);
  });

  it("rejects with timeout error for aborted requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        init.signal?.addEventListener("abort", () => {});
        const err = new DOMException("aborted", "AbortError");
        throw err;
      }),
    );

    await expect(
      requestJson("http://127.0.0.1:5030/api/v1/db", { timeoutMs: 1 }),
    ).rejects.toMatchObject({
      name: "ChatlogHttpError",
      message: "请求超时",
    });
  });

  it("emits a redacted HTTP success diagnostic event when requested", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    await requestJson("http://127.0.0.1:5030/api/v1/db?dataKey=raw-secret", {
      diagnostics: {
        endpointFamily: "db",
        method: "GET",
      },
      onDiagnosticEvent: (event) => events.push(event),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      level: "info",
      category: "http.request",
      privacy: "safe",
      attributes: {
        endpointFamily: "db",
        method: "GET",
        status: 200,
      },
    });
    expect(JSON.stringify(events[0])).not.toContain("raw-secret");
    expect(JSON.stringify(events[0])).not.toContain("dataKey");
  });

  it("emits a diagnostic event for HTTP errors without response body content", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("private db failure body", { status: 503 })),
    );

    await expect(
      requestJson("http://127.0.0.1:5030/api/v1/db", {
        diagnostics: {
          endpointFamily: "db",
          method: "GET",
        },
        onDiagnosticEvent: (event) => events.push(event),
      }),
    ).rejects.toBeInstanceOf(ChatlogHttpError);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      level: "warn",
      category: "http.error",
      attributes: {
        endpointFamily: "db",
        method: "GET",
        status: 503,
        errorKind: "http-status",
      },
    });
    expect(JSON.stringify(events[0])).not.toContain("private db failure body");
  });

  it("honors caller abort signals without waiting for the timeout controller", async () => {
    const events: DiagnosticEvent[] = [];
    const callerController = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const signal = init.signal;
        expect(signal).toBeDefined();

        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
          callerController.abort();
        });
      }),
    );

    await expect(
      requestJson("http://127.0.0.1:5030/api/v1/history", {
        signal: callerController.signal,
        timeoutMs: 5000,
        diagnostics: {
          endpointFamily: "history",
          method: "GET",
        },
        onDiagnosticEvent: (event) => events.push(event),
      }),
    ).rejects.toMatchObject({
      name: "ChatlogHttpError",
      message: "请求已取消",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      level: "warn",
      category: "http.abort",
      attributes: {
        endpointFamily: "history",
        method: "GET",
        errorKind: "abort",
        retryable: false,
      },
    });
  });

  it("preserves caller abort signals when diagnostics options are merged", () => {
    const controller = new AbortController();

    const merged = withRequestDiagnostics(
      {
        signal: controller.signal,
        diagnostics: {
          endpointFamily: "search",
          recoveryHint: "retry",
        },
      } as never,
      {
        endpointFamily: "search",
        method: "GET",
      },
    );

    expect((merged as RequestInit).signal).toBe(controller.signal);
  });
});
