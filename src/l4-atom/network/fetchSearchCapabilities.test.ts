import { describe, expect, it, vi } from "vitest";
import { fetchSearchCapabilities } from "./fetchSearch";

describe("fetchSearchCapabilities", () => {
  it("adapts a valid search.v2 capability response from the configured local service", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          contract_version: "search.v2",
          exact_total: true,
          complete_scope: true,
          sender_filter: true,
          taxonomy: [
            "text",
            "image_emoji",
            "video",
            "voice",
            "file",
            "link_card",
            "quote_forward",
            "location",
            "system_other",
          ],
          snapshot_cursor: true,
          inclusive_time_boundaries: true,
          default_page_size: 50,
          max_page_size: 50,
          max_keyword_graphemes: 200,
          max_keyword_terms: 20,
          directory_version: "search.directory.v1",
          conversation_directory: true,
          sender_directory: true,
          directory_self_sender_id: "chatlog:sender:self:v1",
          directory_default_page_size: 50,
          directory_max_page_size: 100,
          directory_max_query_graphemes: 200,
        }),
        { status: 200 },
      );
    };

    try {
      await expect(
        fetchSearchCapabilities({ serviceBaseUrl: "http://127.0.0.1:6041" }),
      ).resolves.toEqual({
        mode: "v2",
        contractVersion: "search.v2",
        exactTotal: true,
        completeScope: true,
        senderFilter: true,
        taxonomy: [
          "text",
          "image_emoji",
          "video",
          "voice",
          "file",
          "link_card",
          "quote_forward",
          "location",
          "system_other",
        ],
        snapshotCursor: true,
        inclusiveTimeBoundaries: true,
        defaultPageSize: 50,
        maxPageSize: 50,
        maxKeywordGraphemes: 200,
        maxKeywordTerms: 20,
        directoryVersion: "search.directory.v1",
        conversationDirectory: true,
        senderDirectory: true,
        directorySelfSenderId: "chatlog:sender:self:v1",
        directoryDefaultPageSize: 50,
        directoryMaxPageSize: 100,
        directoryMaxQueryGraphemes: 200,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(new URL(calls[0].url)).toMatchObject({
      origin: "http://127.0.0.1:6041",
      pathname: "/api/v1/search/capabilities",
    });
    expect(calls[0].init?.method).toBe("GET");
  });

  it("falls back honestly when the capability endpoint is not supported", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("not found", { status: 404 });
    try {
      await expect(fetchSearchCapabilities()).resolves.toMatchObject({
        mode: "legacy",
        contractVersion: "legacy",
        exactTotal: false,
        completeScope: false,
        senderFilter: false,
        snapshotCursor: false,
        conversationDirectory: false,
        senderDirectory: false,
        unavailableReason: "not_supported",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails closed to legacy limits for a malformed success body", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          contract_version: "search.v2",
          exact_total: "pretend true",
          taxonomy: ["text", "PRIVATE CANARY"],
        }),
        { status: 200 },
      );
    try {
      const result = await fetchSearchCapabilities();
      expect(result).toMatchObject({
        mode: "legacy",
        exactTotal: false,
        completeScope: false,
        senderFilter: false,
        snapshotCursor: false,
        conversationDirectory: false,
        senderDirectory: false,
        unavailableReason: "invalid_response",
      });
      expect(JSON.stringify(result)).not.toContain("PRIVATE");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not advertise v2 when the complete directory capability block is absent", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          contract_version: "search.v2",
          exact_total: true,
          complete_scope: true,
          sender_filter: true,
          taxonomy: [
            "text",
            "image_emoji",
            "video",
            "voice",
            "file",
            "link_card",
            "quote_forward",
            "location",
            "system_other",
          ],
          snapshot_cursor: true,
          inclusive_time_boundaries: true,
          default_page_size: 50,
          max_page_size: 50,
          max_keyword_graphemes: 200,
          max_keyword_terms: 20,
        }),
        { status: 200 },
      );
    try {
      await expect(fetchSearchCapabilities()).resolves.toMatchObject({
        mode: "legacy",
        conversationDirectory: false,
        senderDirectory: false,
        unavailableReason: "invalid_response",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("propagates non-404 readiness failures instead of pretending legacy is available", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    try {
      await expect(fetchSearchCapabilities()).rejects.toMatchObject({ status: 503 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("honors caller cancellation", async () => {
    const controller = new AbortController();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    );
    try {
      const outcome = fetchSearchCapabilities({ signal: controller.signal });
      controller.abort();
      await expect(outcome).rejects.toMatchObject({ message: "请求已取消" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
