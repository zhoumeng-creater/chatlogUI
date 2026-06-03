import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import {
  clearDbCache,
  executeReadOnlyDbQuery,
  fetchDbFiles,
  fetchDbTableData,
  fetchDbTables,
  searchDb,
} from "./fetchDbExplorer";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchDbExplorer", () => {
  it("calls DB explorer endpoints with JSON format and adapted responses", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);

        if (url.includes("/api/v1/db/tables")) {
          return new Response(JSON.stringify(["MSG", "Contact"]), { status: 200 });
        }
        if (url.includes("/api/v1/db/data")) {
          return new Response(JSON.stringify([{ id: 1, summary: "Synthetic row" }]), { status: 200 });
        }
        if (url.includes("/api/v1/db/search")) {
          return new Response(JSON.stringify({ keyword: "synthetic", mode: "quick", total: 0, items: [] }), { status: 200 });
        }
        if (url.includes("/api/v1/db/query")) {
          return new Response(JSON.stringify([{ id: 2, summary: "Synthetic query row" }]), { status: 200 });
        }
        if (url.includes("/api/v1/cache/clear")) {
          expect(init?.method).toBe("POST");
          return new Response(JSON.stringify({ message: "Cache cleared successfully", deletedCount: 2 }), { status: 200 });
        }
        if (new URL(url).pathname === "/api/v1/db") {
          return new Response(JSON.stringify({ MicroMsg: ["MSG0.db"] }), { status: 200 });
        }

        return new Response("not found", { status: 404 });
      }),
    );

    await expect(fetchDbFiles()).resolves.toHaveLength(1);
    await expect(fetchDbTables({ group: "MicroMsg", file: "MSG0.db" })).resolves.toEqual(["MSG", "Contact"]);
    await expect(fetchDbTableData({ group: "MicroMsg", file: "MSG0.db", table: "MSG", limit: 10 })).resolves.toMatchObject({
      rowCount: 1,
      columns: ["id", "summary"],
    });
    await expect(searchDb({ keyword: "synthetic", mode: "quick", limit: 20 })).resolves.toMatchObject({
      keyword: "synthetic",
    });
    await expect(executeReadOnlyDbQuery({ group: "MicroMsg", file: "MSG0.db", sql: "select * from MSG limit 1" })).resolves.toMatchObject({
      rowCount: 1,
    });
    await expect(clearDbCache()).resolves.toEqual({
      message: "Cache cleared successfully",
      deletedCount: 2,
    });

    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      "/api/v1/db",
      "/api/v1/db/tables",
      "/api/v1/db/data",
      "/api/v1/db/search",
      "/api/v1/db/query",
      "/api/v1/cache/clear",
    ]);
    expect(urls.every((url) => new URL(url).searchParams.get("format") === "json")).toBe(true);
    expect(new URL(urls[4]).searchParams.get("sql")).toBe("select * from MSG limit 1");
  });

  it("blocks unsafe DB query SQL before network dispatch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      executeReadOnlyDbQuery({
        group: "MicroMsg",
        file: "MSG0.db",
        sql: "delete from MSG",
      }),
    ).rejects.toMatchObject({
      name: "DbQueryBlockedError",
      reason: "mutation",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("emits diagnostics without keyword, SQL, or result body content", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify([{ summary: "Synthetic private response body" }]), { status: 200 }),
      ),
    );

    await executeReadOnlyDbQuery(
      { group: "MicroMsg", file: "MSG0.db", sql: "select * from MSG where content like '%private%'" },
      {
        diagnostics: {
          endpointFamily: "db_query",
          correlationId: "p4d-developer",
          recoveryHint: "retry",
        },
        onDiagnosticEvent: (event) => events.push(event),
      },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      correlationId: "p4d-developer",
      attributes: {
        endpointFamily: "db_query",
        method: "GET",
        status: 200,
      },
    });
    expect(JSON.stringify(events[0])).not.toContain("private");
    expect(JSON.stringify(events[0])).not.toContain("select * from MSG");
  });
});
