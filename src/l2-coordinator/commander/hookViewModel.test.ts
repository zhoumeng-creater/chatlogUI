import { describe, expect, it } from "vitest";
import { buildHookView, validateHookConfigSave } from "./hookViewModel";
import type { HookStoreSnapshot } from "@l2/data-clerk/stores/useHookStore";

describe("hookViewModel", () => {
  it("builds privacy-safe Hook status, event rows, and clear copy", () => {
    const view = buildHookView(snapshot(), true);

    expect(view.statusSummary).toContain("运行中");
    expect(view.eventRows[0]).toMatchObject({
      identityLabel: "已隐藏对象",
      contentPreview: "已隐藏内容",
    });
    expect(view.clearCopy).toContain("确认");
    expect(JSON.stringify(view)).not.toContain("private");
    expect(JSON.stringify(view)).not.toContain("synthetic-token");
    expect(JSON.stringify(view)).not.toContain("synthetic.invalid");
  });

  it("blocks saves that would implicitly clear masked POST or scoped forwarding values", () => {
    const current = snapshot().config!;

    expect(validateHookConfigSave(current, {
      keywordsText: "alpha",
      notifyTargets: current.notifyTargets,
      postUrl: "",
      beforeCount: 2,
      afterCount: 3,
      forwardAll: false,
      forwardContactsText: "contact_a",
      forwardChatroomsText: "room_a",
    })).toContain("POST");

    expect(validateHookConfigSave(current, {
      keywordsText: "alpha",
      notifyTargets: current.notifyTargets,
      postUrl: "https://synthetic.invalid/hook",
      beforeCount: 2,
      afterCount: 3,
      forwardAll: false,
      forwardContactsText: "",
      forwardChatroomsText: "room_a",
    })).toContain("联系人");

    expect(validateHookConfigSave(current, {
      keywordsText: "alpha",
      notifyTargets: current.notifyTargets,
      postUrl: "https://synthetic.invalid/hook",
      beforeCount: 2,
      afterCount: 3,
      forwardAll: true,
      forwardContactsText: "",
      forwardChatroomsText: "",
    })).toBeNull();
  });
});

function snapshot(): HookStoreSnapshot {
  return {
    activeSubtab: "events",
    configStatus: "ready",
    statusStatus: "ready",
    eventsStatus: "ready",
    streamStatus: "streaming",
    clearStatus: "idle",
    config: {
      keywords: ["alpha"],
      notifyMode: "mcp,weixin",
      notifyTargets: { mcp: true, post: false, weixin: true, qq: false },
      postUrlConfigured: true,
      beforeCount: 2,
      afterCount: 3,
      forwardAll: false,
      forwardContactCount: 1,
      forwardChatroomCount: 1,
    },
    statusSummary: {
      running: true,
      keywordsCount: 2,
      notifyMode: "mcp,weixin",
      notifyTargets: { mcp: true, post: false, weixin: true, qq: false },
      postUrlConfigured: true,
      beforeCount: 2,
      afterCount: 3,
      forwardAll: false,
      forwardContactCount: 1,
      forwardChatroomCount: 1,
      sseClients: 1,
      eventCount: 2,
      lastEventAt: "2026-01-03T08:00:00Z",
      eventsStoreConfigured: true,
      mcpNotificationMethod: "notifications/chatlog/keyword_hit",
      weixin: {
        channel: "weixin",
        installed: true,
        enabled: true,
        available: true,
        editable: true,
        hasCredential: true,
        hasChannel: true,
        hasPath: true,
        error: "",
      },
      qq: {
        channel: "qq",
        installed: true,
        enabled: false,
        available: true,
        editable: true,
        hasCredential: true,
        hasChannel: true,
        hasPath: true,
        error: "",
      },
    },
    events: [{
      id: "1",
      createdAt: "2026-01-03T08:00:00Z",
      ruleType: "keyword",
      ruleLabel: "Synthetic rule",
      keywordMatched: true,
      identityLabel: "已隐藏对象",
      contentPreview: "已隐藏内容",
      triggerTime: "2026-01-03 08:00:00",
      triggerSeq: 1,
      contextCount: 1,
      deliverySummary: "1/1 delivered",
      deliveryTargets: ["mcp"],
    }],
    clearConfirmationPending: true,
    configError: null,
    statusError: null,
    eventsError: null,
    streamError: null,
    clearError: null,
  };
}
