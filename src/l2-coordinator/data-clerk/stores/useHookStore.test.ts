import { beforeEach, describe, expect, it } from "vitest";
import { useHookStore } from "./useHookStore";
import type { HookConfigView, HookEventSummary, HookStatusView } from "@l4/network";

describe("useHookStore", () => {
  beforeEach(() => {
    useHookStore.getState().reset();
  });

  it("tracks Hook config/status/events/stream and bounded safe events", () => {
    useHookStore.getState().setConfigLoading();
    expect(useHookStore.getState().configStatus).toBe("loading");

    useHookStore.getState().setConfig(configView());
    useHookStore.getState().setStatusSummary(statusView());
    useHookStore.getState().setEvents([event("1"), event("2")]);
    useHookStore.getState().prependStreamEvent(event("3"));

    expect(useHookStore.getState()).toMatchObject({
      configStatus: "ready",
      statusStatus: "ready",
      eventsStatus: "ready",
      streamStatus: "streaming",
    });
    expect(useHookStore.getState().events.map((item) => item.id)).toEqual(["3", "1", "2"]);
    expect(JSON.stringify(useHookStore.getState().events)).not.toContain("private");
  });

  it("requires clear confirmation before destructive clear is marked loading", () => {
    expect(useHookStore.getState().clearConfirmationPending).toBe(false);
    useHookStore.getState().requestClearConfirmation();
    expect(useHookStore.getState().clearConfirmationPending).toBe(true);
    useHookStore.getState().setClearLoading();
    expect(useHookStore.getState()).toMatchObject({
      clearStatus: "loading",
      clearConfirmationPending: false,
    });
  });

  it("stores errors per area and resets stream state", () => {
    useHookStore.getState().setConfigError("配置失败");
    useHookStore.getState().setStreamConnecting();
    useHookStore.getState().stopStream();

    expect(useHookStore.getState()).toMatchObject({
      configStatus: "error",
      configError: "配置失败",
      streamStatus: "stopped",
    });
  });

  it("marks snapshot-only Hook streams as live", () => {
    useHookStore.getState().setStreamConnecting();
    useHookStore.getState().setEvents([]);
    useHookStore.getState().markStreamStreaming();

    expect(useHookStore.getState()).toMatchObject({
      eventsStatus: "empty",
      streamStatus: "streaming",
      streamError: null,
    });
  });
});

function configView(): HookConfigView {
  return {
    keywords: ["alpha"],
    notifyMode: "mcp",
    notifyTargets: { mcp: true, post: false, weixin: false, qq: false },
    postUrlConfigured: false,
    beforeCount: 1,
    afterCount: 1,
    forwardAll: false,
    forwardContactCount: 0,
    forwardChatroomCount: 0,
  };
}

function statusView(): HookStatusView {
  return {
    running: true,
    keywordsCount: 1,
    notifyMode: "mcp",
    notifyTargets: { mcp: true, post: false, weixin: false, qq: false },
    postUrlConfigured: false,
    beforeCount: 1,
    afterCount: 1,
    forwardAll: false,
    forwardContactCount: 0,
    forwardChatroomCount: 0,
    sseClients: 1,
    eventCount: 2,
    lastEventAt: "2026-01-03T08:00:00Z",
    eventsStoreConfigured: true,
    mcpNotificationMethod: "notifications/chatlog/keyword_hit",
    weixin: {
      channel: "weixin",
      installed: true,
      enabled: false,
      available: true,
      editable: true,
      hasCredential: false,
      hasChannel: false,
      hasPath: false,
      error: "",
    },
    qq: {
      channel: "qq",
      installed: false,
      enabled: false,
      available: false,
      editable: false,
      hasCredential: false,
      hasChannel: false,
      hasPath: false,
      error: "",
    },
  };
}

function event(id: string): HookEventSummary {
  return {
    id,
    createdAt: "2026-01-03T08:00:00Z",
    ruleType: "keyword",
    ruleLabel: "Synthetic rule",
    keywordMatched: true,
    identityLabel: "已隐藏对象",
    contentPreview: "已隐藏内容",
    triggerTime: "2026-01-03 08:00:00",
    triggerSeq: 1,
    contextCount: 0,
    deliverySummary: "1/1 delivered",
    deliveryTargets: ["mcp"],
  };
}
