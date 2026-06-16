import { describe, expect, it, vi } from "vitest";
import { fetchSearch } from "./fetchSearch";

describe("fetchSearch", () => {
  it("serializes search filters without duplicating format=json", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({
          total_count: 0,
          count: 0,
          limit: 25,
          offset: 10,
          messages: [],
        }),
        { status: 200 },
      );
    };

    try {
      await fetchSearch({
        keyword: "synthetic keyword",
        limit: 25,
        offset: 10,
        chats: ["session_synthetic_001", "chatroom_synthetic_001@chatroom"],
        since: 1767254400,
        until: 1767340800,
        msgType: "image",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const url = new URL(urls[0]);
    expect(url.pathname).toBe("/api/v1/search");
    expect(url.searchParams.get("keyword")).toBe("synthetic keyword");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("offset")).toBe("10");
    expect(url.searchParams.get("chats")).toBe(
      "session_synthetic_001,chatroom_synthetic_001@chatroom",
    );
    expect(url.searchParams.get("since")).toBe("1767254400");
    expect(url.searchParams.get("until")).toBe("1767340800");
    expect(url.searchParams.get("msg_type")).toBe("image");
    expect(url.searchParams.getAll("format")).toEqual(["json"]);
  });

  it("honors caller abort signals", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const originalFetch = globalThis.fetch;
    let outcomePromise: Promise<{ status: "resolved" | "rejected"; error?: unknown }> | undefined;

    globalThis.fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });

    try {
      outcomePromise = fetchSearch(
        { keyword: "synthetic abort", limit: 1 },
        { signal: controller.signal },
      ).then(
        () => ({ status: "resolved" }),
        (error: unknown) => ({ status: "rejected", error }),
      );

      controller.abort();
      await vi.advanceTimersByTimeAsync(1);

      await expect(outcomePromise).resolves.toMatchObject({
        status: "rejected",
        error: { name: "ChatlogHttpError", message: "请求已取消" },
      });
    } finally {
      await vi.advanceTimersByTimeAsync(20000);
      await outcomePromise;
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  });
});
