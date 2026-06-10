import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchDbReadiness, fetchHealth } from "./readiness";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readiness fetchers", () => {
  it("accepts bare host:port service addresses from chatlog config summaries", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }),
    );

    await expect(fetchHealth("127.0.0.1:5030")).resolves.toBe(true);
    expect(capturedUrl).toBe("http://127.0.0.1:5030/health?format=json");
  });

  it("emits a health diagnostic event when diagnostics are supplied", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })),
    );

    await expect(
      fetchHealth("127.0.0.1:5030", {
        diagnostics: { endpointFamily: "health", recoveryHint: "check-service" },
        onDiagnosticEvent: (event) => events.push(event),
      }),
    ).resolves.toBe(true);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      recoveryHint: "check-service",
      attributes: { endpointFamily: "health" },
    });
  });

  it("uses a supplied non-default service base URL for health and DB readiness", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }),
    );

    await expect(fetchHealth("http://127.0.0.1:6041/")).resolves.toBe(true);
    await expect(fetchDbReadiness("http://127.0.0.1:6041/")).resolves.toMatchObject({
      ready: true,
      status: "ready",
    });

    expect(urls.map((url) => new URL(url).origin)).toEqual([
      "http://127.0.0.1:6041",
      "http://127.0.0.1:6041",
    ]);
  });

  it("classifies DB 503 as initializing with plain-language copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("synthetic DB warming", { status: 503 })),
    );

    await expect(fetchDbReadiness("127.0.0.1:6041")).resolves.toMatchObject({
      ready: false,
      status: "initializing",
      message: "服务已启动，数据库尚未就绪",
    });
  });

  it("translates DB HTTP errors to recovery copy instead of raw status text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("synthetic backend stack", { status: 500 })),
    );

    await expect(fetchDbReadiness("127.0.0.1:6041")).resolves.toMatchObject({
      ready: false,
      status: "error",
      message: "数据库状态检查失败，请稍后重试或查看诊断信息。",
    });
  });

  it("rejects remote service origins before issuing a readiness request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchHealth("http://192.168.1.10:5030")).rejects.toThrow("本机");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
