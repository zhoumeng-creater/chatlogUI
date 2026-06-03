import { describe, expect, it } from "vitest";
import {
  adaptHermesStatus,
  adaptHookConfig,
  adaptHookEvent,
  adaptHookStatus,
  buildHermesQQPayload,
  buildHermesWeixinPayload,
  buildHookConfigPayload,
} from "./hookAdapters";

describe("hookAdapters", () => {
  it("adapts hook config without exposing POST URLs", () => {
    const config = adaptHookConfig({
      keywords: "alpha\nbeta",
      notify_mode: "mcp,weixin",
      post_url: "https://synthetic.invalid/hook",
      before_count: 2,
      after_count: 3,
      forward_all: false,
      forward_contacts: "contact_a,contact_b",
      forward_chatrooms: "room_a",
    });

    expect(config).toMatchObject({
      keywords: ["alpha", "beta"],
      notifyMode: "mcp,weixin",
      notifyTargets: { mcp: true, post: false, weixin: true, qq: false },
      postUrlConfigured: true,
      beforeCount: 2,
      afterCount: 3,
      forwardAll: false,
      forwardContactCount: 2,
      forwardChatroomCount: 1,
    });
    expect(JSON.stringify(config)).not.toContain("synthetic.invalid");
  });

  it("builds save payloads and clears scoped targets when forward-all is enabled", () => {
    const payload = buildHookConfigPayload({
      keywordsText: "alpha\nbeta",
      notifyTargets: { mcp: true, post: true, weixin: false, qq: false },
      postUrl: "https://synthetic.invalid/hook",
      beforeCount: 1,
      afterCount: 2,
      forwardAll: true,
      forwardContactsText: "contact_a",
      forwardChatroomsText: "room_a",
    });

    expect(payload).toEqual({
      keywords: "",
      notify_mode: "both",
      post_url: "https://synthetic.invalid/hook",
      before_count: 1,
      after_count: 2,
      forward_all: true,
      forward_contacts: "",
      forward_chatrooms: "",
    });
  });

  it("builds Hermes Weixin save payloads with the backend contract keys", () => {
    expect(buildHermesWeixinPayload({
      hermesHome: " C:/Hermes ",
      accountId: " account-id ",
      token: " synthetic-token ",
      baseUrl: " https://qyapi.weixin.qq.com ",
      cdnBaseUrl: " https://cdn.synthetic.invalid ",
      homeChannel: " 1001 ",
      homeChannelName: " general ",
    })).toEqual({
      hermes_home: "C:/Hermes",
      account_id: "account-id",
      token: "synthetic-token",
      base_url: "https://qyapi.weixin.qq.com",
      cdn_base_url: "https://cdn.synthetic.invalid",
      home_channel: "1001",
      home_channel_name: "general",
    });
  });

  it("builds Hermes QQ save payloads with the backend contract keys", () => {
    expect(buildHermesQQPayload({
      hermesHome: " C:/Hermes ",
      appId: " app-id ",
      clientSecret: " synthetic-secret ",
      homeChannel: " 2002 ",
      homeChannelName: " ops ",
    })).toEqual({
      hermes_home: "C:/Hermes",
      app_id: "app-id",
      client_secret: "synthetic-secret",
      home_channel: "2002",
      home_channel_name: "ops",
    });
  });

  it("adapts hook status and Hermes credential/path presence without raw sensitive values", () => {
    const status = adaptHookStatus({
      running: true,
      keywords_count: 2,
      notify_mode: "all",
      post_url: "https://synthetic.invalid/hook",
      sse_clients: 3,
      event_count: 5,
      last_event_at: "2026-01-03T08:00:00Z",
      events_store_file: "synthetic-hook-events-store",
      weixin: {
        installed: true,
        enabled: true,
        available: true,
        editable: true,
        hermes_home: "synthetic-hermes-home",
        token: "synthetic-token-redaction-target",
        account_id: "synthetic-account-id",
      },
      qq: {
        installed: true,
        enabled: true,
        available: true,
        editable: true,
        config_file: "synthetic-config-file",
        client_secret: "synthetic-client-secret-redaction-target",
        app_id: "synthetic-app-id",
      },
    });

    expect(status).toMatchObject({
      running: true,
      keywordsCount: 2,
      notifyMode: "all",
      sseClients: 3,
      eventCount: 5,
      postUrlConfigured: true,
      eventsStoreConfigured: true,
      weixin: { hasCredential: true, hasPath: true },
      qq: { hasCredential: true, hasPath: true },
    });
    expect(JSON.stringify(status)).not.toContain("synthetic-token");
    expect(JSON.stringify(status)).not.toContain("client-secret");
    expect(JSON.stringify(status)).not.toContain("synthetic-hermes-home");
    expect(JSON.stringify(status)).not.toContain("synthetic.invalid");
  });

  it("adapts Hermes status as display-safe presence fields", () => {
    const hermes = adaptHermesStatus("weixin", {
      installed: true,
      enabled: true,
      available: true,
      editable: true,
      account_id: "synthetic-account-id",
      token: "synthetic-token-redaction-target",
      home_channel: "synthetic-home-channel",
      hermes_home: "synthetic-hermes-home",
    });

    expect(hermes).toMatchObject({
      channel: "weixin",
      installed: true,
      enabled: true,
      available: true,
      editable: true,
      hasCredential: true,
      hasChannel: true,
      hasPath: true,
    });
    expect(JSON.stringify(hermes)).not.toContain("synthetic-account-id");
    expect(JSON.stringify(hermes)).not.toContain("synthetic-token");
    expect(JSON.stringify(hermes)).not.toContain("synthetic-home-channel");
  });

  it("adapts hook events into bounded safe summaries", () => {
    const event = adaptHookEvent({
      id: 90001,
      created_at: "2026-01-03T08:00:00Z",
      rule_type: "keyword",
      rule_label: "synthetic keyword rule",
      keyword: "private-keyword",
      talker: "synthetic_talker_alpha",
      talker_name: "Synthetic Talker Alpha",
      sender: "synthetic_sender_alpha",
      sender_name: "Synthetic Sender Alpha",
      trigger_content: "Synthetic private trigger content",
      context: [{ content: "Synthetic private context" }, { content: "Second context" }],
      deliveries: [
        { target: "mcp", status: "queued", success: true },
        { target: "post", status: "failed", success: false },
      ],
    });

    expect(event).toMatchObject({
      id: "90001",
      ruleType: "keyword",
      ruleLabel: "synthetic keyword rule",
      keywordMatched: true,
      identityLabel: "已隐藏对象",
      contentPreview: "已隐藏内容",
      contextCount: 2,
      deliverySummary: "1/2 delivered",
    });
    expect(JSON.stringify(event)).not.toContain("private");
    expect(JSON.stringify(event)).not.toContain("synthetic_talker");
    expect(JSON.stringify(event)).not.toContain("Synthetic Sender");
  });
});
