import { describe, expect, it, vi } from "vitest";
import { fetchHistory } from "./fetchHistory";

describe("fetchHistory", () => {
  it("passes timestamp window params to the history endpoint", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ count: 0, messages: [] }), { status: 200 });
    };

    try {
      await fetchHistory({ chat: "wxid_synthetic_user", limit: 50, offset: 0, since: 100, until: 200 });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const url = new URL(urls[0]);
    expect(url.pathname).toBe("/api/v1/history");
    expect(url.searchParams.get("chat")).toBe("wxid_synthetic_user");
    expect(url.searchParams.get("since")).toBe("100");
    expect(url.searchParams.get("until")).toBe("200");
  });

  it("honors caller abort signals", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const originalFetch = globalThis.fetch;
    type Outcome =
      | { status: "pending" }
      | { status: "rejected"; error: unknown }
      | { status: "resolved" };
    let outcomePromise: Promise<Outcome> | undefined;

    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });

    try {
      outcomePromise = fetchHistory(
        { chat: "wxid_synthetic_user", limit: 50, offset: 0 },
        { signal: controller.signal },
      ).then(
        () => ({ status: "resolved" }),
        (error: unknown) => ({ status: "rejected", error }),
      );
      const pendingMarker = new Promise<Outcome>((resolve) => {
        setTimeout(() => resolve({ status: "pending" }), 1);
      });

      controller.abort();
      await vi.advanceTimersByTimeAsync(1);

      await expect(Promise.race([outcomePromise, pendingMarker])).resolves.toMatchObject({
        status: "rejected",
        error: {
          name: "ChatlogHttpError",
          message: "请求已取消",
        },
      });
    } finally {
      await vi.advanceTimersByTimeAsync(30000);
      await outcomePromise;
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  });
});
