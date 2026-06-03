import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getEndpointCatalog,
  getEndpointCatalogEntry,
  runEndpointCatalogEntry,
} from "./endpointRunner";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("endpointRunner", () => {
  it("exposes a local-only allowlist catalog without raw HTTP controls", () => {
    const catalog = getEndpointCatalog();

    expect(catalog.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "health",
        "ping",
        "sessions",
        "history",
        "search",
        "unread",
        "members",
        "new_messages",
        "stats",
        "favorites",
        "contacts",
        "chatrooms",
        "db",
        "db_query",
        "image",
        "video",
        "file",
        "voice",
        "data",
        "mcp",
        "mcp_sse",
        "mcp_message",
        "cache_clear",
      ]),
    );
    expect(catalog.every((entry) => entry.baseUrlPolicy === "local-sidecar")).toBe(true);
    expect(JSON.stringify(catalog)).not.toContain("raw_path");
    expect(JSON.stringify(catalog)).not.toContain("body_file");
    expect(JSON.stringify(catalog)).not.toContain("headers");
    expect(getEndpointCatalogEntry("db_query")?.params.map((param) => param.name)).toEqual(["group", "file", "sql"]);
    expect(getEndpointCatalogEntry("image")).toMatchObject({
      method: "GET",
      pathTemplate: "/image/{key}",
      baseUrlPolicy: "local-sidecar",
    });
    expect(getEndpointCatalogEntry("mcp")).toMatchObject({
      method: "POST",
      pathTemplate: "/mcp",
      baseUrlPolicy: "local-sidecar",
    });
  });

  it("runs a catalog entry by building the local sidecar request from schema parameters", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        return new Response(JSON.stringify([{ id: 1, content: "Synthetic private response body" }]), { status: 200 });
      }),
    );

    const result = await runEndpointCatalogEntry({
      entryId: "db_query",
      params: {
        group: "MicroMsg",
        file: "MSG0.db",
        sql: "select * from MSG limit 1",
      },
    });

    expect(new URL(urls[0]).pathname).toBe("/api/v1/db/query");
    expect(new URL(urls[0]).origin).toBe("http://127.0.0.1:5030");
    expect(new URL(urls[0]).searchParams.get("format")).toBe("json");
    expect(result).toMatchObject({
      entryId: "db_query",
      endpointFamily: "db_query",
      method: "GET",
      status: 200,
      parameterKeys: ["group", "file", "sql"],
      redacted: true,
    });
    expect(result.preview).not.toContain("private response body");
    expect(result.preview).toContain("[redacted]");
  });

  it("blocks unsafe SQL and cache clear without confirmation before network dispatch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      runEndpointCatalogEntry({
        entryId: "db_query",
        params: {
          group: "MicroMsg",
          file: "MSG0.db",
          sql: "drop table MSG",
        },
      }),
    ).rejects.toMatchObject({
      name: "EndpointRunnerBlockedError",
      reason: "unsafe-sql",
    });

    await expect(
      runEndpointCatalogEntry({
        entryId: "cache_clear",
        params: {},
      }),
    ).rejects.toMatchObject({
      name: "EndpointRunnerBlockedError",
      reason: "confirmation-required",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects unknown endpoints and unknown parameters instead of acting as a raw HTTP client", async () => {
    await expect(
      runEndpointCatalogEntry({ entryId: "raw_path", params: { path: "/api/v1/db" } }),
    ).rejects.toMatchObject({
      name: "EndpointRunnerBlockedError",
      reason: "unknown-endpoint",
    });

    await expect(
      runEndpointCatalogEntry({
        entryId: "health",
        params: {
          raw_path: "/api/v1/db",
        },
      }),
    ).rejects.toMatchObject({
      name: "EndpointRunnerBlockedError",
      reason: "unknown-parameter",
    });
  });

  it("validates schema enum and bounded numeric parameters before dispatch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      runEndpointCatalogEntry({
        entryId: "db_search",
        params: {
          keyword: "synthetic",
          mode: "raw",
        },
      }),
    ).rejects.toMatchObject({
      name: "EndpointRunnerBlockedError",
      reason: "invalid-parameter",
    });

    await expect(
      runEndpointCatalogEntry({
        entryId: "search",
        params: {
          keyword: "synthetic",
          limit: 10000,
        },
      }),
    ).rejects.toMatchObject({
      name: "EndpointRunnerBlockedError",
      reason: "invalid-parameter",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("builds local media path aliases from schema path parameters without raw URL controls", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );

    await runEndpointCatalogEntry({
      entryId: "image",
      params: {
        key: "synthetic image key",
      },
    });

    const url = new URL(urls[0]);
    expect(url.origin).toBe("http://127.0.0.1:5030");
    expect(url.pathname).toBe("/image/synthetic%20image%20key");
    expect(url.searchParams.get("key")).toBeNull();
  });
});
