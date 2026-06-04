import { describe, expect, it } from "vitest";
import type { ContactProfileData, TopicsResponse } from "@/l2-coordinator/api-docs/semantic";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { buildSemanticDiscoveryView } from "./semanticDiscoveryViewModel";

describe("semanticDiscoveryViewModel", () => {
  it("keeps topic stats visible when summary generation failed", () => {
    const view = buildSemanticDiscoveryView({
      conversations: conversations(),
      currentChat: "wxid_alpha",
      currentContactName: "Synthetic Session Alpha",
      privacyOn: false,
      window: "30d",
      scope: "selected",
      selectedChats: ["wxid_alpha", "room_beta"],
      depth: "deep",
      sourceLimit: 8,
      rerank: true,
      topics: topicsWithSummaryError(),
      profile: null,
    });

    expect(view.context.scopeLabel).toBe("2 个会话");
    expect(view.context.windowLabel).toBe("近 30 天");
    expect(view.topics?.summaryError).toBe("summary model unavailable");
    expect(view.topics?.countLabel).toBe("18 条消息");
    expect(view.topics?.truncatedLabel).toBe("已截断");
    expect(view.topics?.daily).toHaveLength(2);
    expect(view.topics?.rows[0]).toMatchObject({
      label: "release",
      countLabel: "7",
      keywords: ["risk", "ship"],
    });
  });

  it("masks profile labels in privacy mode while preserving sender ids for QA entity override", () => {
    const view = buildSemanticDiscoveryView({
      conversations: conversations(),
      currentChat: "wxid_alpha",
      currentContactName: "Synthetic Session Alpha",
      privacyOn: true,
      window: "7d",
      scope: "contact",
      selectedChats: [],
      depth: "standard",
      sourceLimit: 6,
      rerank: false,
      topics: null,
      profile: profileWithRows(),
    });

    expect(view.profile?.summary).toBe("******* *****");
    expect(view.profile?.summaryError).toBe("summary timeout");
    expect(view.profile?.rows[0]).toMatchObject({
      senderId: "wxid_sender",
      senderLabel: "*****",
      canAskAboutSender: true,
      keywords: ["**** (5)"],
    });
    expect(view.previewTalkerOptions).toEqual([
      { value: "all", label: "全部会话" },
      { value: "wxid_alpha", label: "********* ******* *****" },
      { value: "room_beta", label: "******* ****" },
    ]);
  });
});

function topicsWithSummaryError(): TopicsResponse {
  return {
    window: "30d",
    windowLabel: "Last 30 days",
    count: 18,
    truncated: true,
    summaryError: "summary model unavailable",
    topics: [
      { topic: "release", count: 7, keywords: ["risk", "ship"] },
      { topic: "support", count: 3 },
    ],
    daily: [
      { date: "2026-06-04", count: 5 },
      { date: "2026-06-05", count: 8 },
    ],
  };
}

function profileWithRows(): ContactProfileData {
  return {
    window: "7d",
    windowLabel: "Last 7 days",
    count: 12,
    truncated: false,
    summary: "private notes",
    summaryError: "summary timeout",
    profiles: [
      {
        sender: "wxid_sender",
        senderName: "Alice",
        messages: 9,
        topKeywords: [{ topic: "risk", count: 5 }],
      },
    ],
    typeDistribution: [{ type: "person", count: 1 }],
  };
}

function conversations(): Conversation[] {
  return [
    {
      id: "conv-alpha",
      username: "wxid_alpha",
      displayName: "Synthetic Session Alpha",
      chatType: "friend",
      isGroup: false,
      summary: "",
      timestamp: 0,
      timeLabel: "",
      unread: 0,
      lastSender: "",
      source: "fixture",
    },
    {
      id: "conv-beta",
      username: "room_beta",
      displayName: "Project Room",
      chatType: "chatroom",
      isGroup: true,
      summary: "",
      timestamp: 0,
      timeLabel: "",
      unread: 0,
      lastSender: "",
      source: "fixture",
    },
  ];
}
