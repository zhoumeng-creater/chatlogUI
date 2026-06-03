import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import {
  clearHookEvents,
  fetchHermesQQStatus,
  fetchHermesWeixinStatus,
  fetchHookConfig,
  fetchHookEvents,
  fetchHookStatus,
  saveHermesQQConfig,
  saveHermesWeixinConfig,
  saveHookConfig,
} from "./fetchHook";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchHook", () => {
  it("calls Hook and Hermes endpoints with JSON format and safe adapters", async () => {
    const urls: string[] = [];
    const methods: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        methods.push(init?.method ?? "GET");

        if (url.includes("/api/v1/hook/config")) {
          return new Response(JSON.stringify({
            keywords: "alpha",
            notify_mode: "mcp",
            post_url: "https://synthetic.invalid/hook",
          }), { status: 200 });
        }
        if (url.includes("/api/v1/hook/status")) {
          return new Response(JSON.stringify({ running: true, event_count: 1 }), { status: 200 });
        }
        if (url.includes("/api/v1/hook/events/clear")) {
          return new Response(JSON.stringify({ ok: true, cleared: 1 }), { status: 200 });
        }
        if (url.includes("/api/v1/hook/events")) {
          return new Response(JSON.stringify({ events: [{ id: 1, trigger_content: "Synthetic private content" }] }), { status: 200 });
        }
        if (url.includes("/api/v1/hook/hermes/weixin")) {
          return new Response(JSON.stringify({ installed: true, token: "synthetic-token-redaction-target" }), { status: 200 });
        }
        if (url.includes("/api/v1/hook/hermes/qq")) {
          return new Response(JSON.stringify({ installed: true, client_secret: "synthetic-client-secret-redaction-target" }), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    await expect(fetchHookConfig()).resolves.toMatchObject({ postUrlConfigured: true });
    await expect(saveHookConfig({ notifyTargets: { mcp: true, post: false, weixin: false, qq: false } })).resolves.toMatchObject({ notifyMode: "mcp" });
    await expect(fetchHookStatus()).resolves.toMatchObject({ running: true });
    await expect(fetchHookEvents({ limit: 10 })).resolves.toHaveLength(1);
    await expect(clearHookEvents()).resolves.toMatchObject({ ok: true, cleared: 1 });
    await expect(fetchHermesWeixinStatus()).resolves.toMatchObject({ channel: "weixin", hasCredential: true });
    await expect(fetchHermesQQStatus()).resolves.toMatchObject({ channel: "qq", hasCredential: true });
    await expect(saveHermesWeixinConfig({
      hermesHome: "C:/Hermes",
      accountId: "account-id",
      token: "synthetic-token-redaction-target",
      baseUrl: "https://qyapi.weixin.qq.com",
      cdnBaseUrl: "https://cdn.synthetic.invalid",
      homeChannel: "1001",
      homeChannelName: "general",
    })).resolves.toMatchObject({ channel: "weixin", hasCredential: true });
    await expect(saveHermesQQConfig({
      hermesHome: "C:/Hermes",
      appId: "app-id",
      clientSecret: "synthetic-client-secret-redaction-target",
      homeChannel: "2002",
      homeChannelName: "ops",
    })).resolves.toMatchObject({ channel: "qq", hasCredential: true });

    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      "/api/v1/hook/config",
      "/api/v1/hook/config",
      "/api/v1/hook/status",
      "/api/v1/hook/events",
      "/api/v1/hook/events/clear",
      "/api/v1/hook/hermes/weixin",
      "/api/v1/hook/hermes/qq",
      "/api/v1/hook/hermes/weixin",
      "/api/v1/hook/hermes/qq",
    ]);
    expect(methods).toEqual(["GET", "POST", "GET", "GET", "POST", "GET", "GET", "POST", "POST"]);
    expect(urls.every((url) => new URL(url).searchParams.get("format") === "json")).toBe(true);
  });

  it("emits HTTP diagnostics without Hook event content or credentials", async () => {
    const events: DiagnosticEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ events: [{ id: 1, trigger_content: "Synthetic private content" }] }), { status: 200 }),
      ),
    );

    await fetchHookEvents(
      { limit: 5 },
      {
        diagnostics: {
          endpointFamily: "hook_events",
          correlationId: "p4e-hook",
          recoveryHint: "retry",
        },
        onDiagnosticEvent: (event) => events.push(event),
      },
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "http",
      category: "http.request",
      attributes: {
        endpointFamily: "hook_events",
        method: "GET",
        status: 200,
      },
    });
    expect(JSON.stringify(events[0])).not.toContain("private");
    expect(JSON.stringify(events[0])).not.toContain("trigger_content");
  });
});
