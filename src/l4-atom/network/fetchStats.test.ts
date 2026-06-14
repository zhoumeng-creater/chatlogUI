import { describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchDashboardTrend, fetchStats } from "./fetchStats";

describe("fetchStats", () => {
  it("serializes stats time-window filters and emits stats diagnostics", async () => {
    const urls: string[] = [];
    const events: DiagnosticEvent[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ chat: "session_synthetic_001" }), { status: 200 });
    };

    try {
      await fetchStats(
        {
          chat: "session_synthetic_001",
          since: 1767254400,
          until: 1767340800,
        },
        {
          diagnostics: { correlationId: "stats-window" },
          onDiagnosticEvent: (event) => events.push(event),
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    const url = new URL(urls[0]);
    expect(url.pathname).toBe("/api/v1/stats");
    expect(url.searchParams.get("chat")).toBe("session_synthetic_001");
    expect(url.searchParams.get("since")).toBe("1767254400");
    expect(url.searchParams.get("until")).toBe("1767340800");
    expect(url.searchParams.getAll("format")).toEqual(["json"]);
    expect(events[0]).toMatchObject({
      source: "http",
      correlationId: "stats-window",
      attributes: { endpointFamily: "stats" },
    });
  });

  it("serializes dashboard trend summary/window params", async () => {
    const urls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ daily: [] }), { status: 200 });
    };

    try {
      await fetchDashboardTrend({ chat: "session_synthetic_001", window: "30d", summary: false });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const url = new URL(urls[0]);
    expect(url.pathname).toBe("/api/v1/dashboard/trend");
    expect(url.searchParams.get("chat")).toBe("session_synthetic_001");
    expect(url.searchParams.get("window")).toBe("30d");
    expect(url.searchParams.get("summary")).toBe("0");
    expect(url.searchParams.getAll("format")).toEqual(["json"]);
  });

  it("honors caller abort signals for stats", async () => {
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
      outcomePromise = fetchStats(
        { chat: "session_synthetic_001" },
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
      await vi.advanceTimersByTimeAsync(15000);
      await outcomePromise;
      vi.useRealTimers();
      globalThis.fetch = originalFetch;
    }
  });
});
