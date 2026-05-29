import { describe, expect, it, vi, afterEach } from "vitest";
import { requestJson, ChatlogHttpError } from "./httpClient";

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
});
