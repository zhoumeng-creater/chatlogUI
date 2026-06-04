import { describe, expect, it } from "vitest";
import {
  buildSemanticDiscoveryView,
  type SemanticDiscoveryViewInput,
} from "./semanticDiscoveryViewModel";

describe("semanticDiscoveryViewModel", () => {
  it("builds a ready context bar with privacy-safe scope and window labels", () => {
    const view = buildSemanticDiscoveryView(baseInput({
      privacyOn: true,
      currentChatLabel: "Project Room",
      window: "30d",
      moduleReady: true,
    }));

    expect(view.context.scopeLabel).toBe("已隐藏当前会话");
    expect(view.context.windowLabel).toBe("30 天");
    expect(view.context.readinessLabel).toBe("语义发现可用");
    expect(view.context.privacyLabel).toBe("隐私模式已开启");
    expect(view.canUseDiscovery).toBe(true);
    expect(JSON.stringify(view)).not.toContain("Project Room");
  });

  it("summarizes semantic search metadata and masks result text in privacy mode", () => {
    const view = buildSemanticDiscoveryView(baseInput({
      privacyOn: true,
      search: {
        query: "deployment",
        loading: false,
        error: null,
        results: {
          query: "deployment",
          totalCount: 1,
          sourceCount: 25,
          count: 1,
          window: "30d",
          depth: "deep",
          rerank: {
            enabled: true,
            provider: "bge",
            tried: true,
            applied: false,
            error: "rerank unavailable",
          },
          results: [
            {
              chat: "wxid_backend_chat",
              chatName: "Project Room",
              sender: "Alice",
              senderId: "wxid_sender",
              time: "2026-06-04T10:00:00Z",
              content: "Synthetic private deployment message",
              relevanceScore: 0.91,
              localId: 123,
            },
          ],
        },
      },
    }));

    expect(view.search.status).toBe("ready");
    expect(view.search.summary).toBe("1 条结果 / 25 条候选 / 30d / deep / rerank 异常");
    expect(view.search.rows[0]).toMatchObject({
      chat: "wxid_backend_chat",
      senderId: "wxid_sender",
      chatLabel: "已隐藏会话",
      senderLabel: "已隐藏发送者",
      contentPreview: "已隐藏内容",
      scoreLabel: "91%",
      localId: 123,
    });
    expect(JSON.stringify(view.search)).not.toContain("Synthetic private");
    expect(JSON.stringify(view.search)).not.toContain("Project Room");
    expect(JSON.stringify(view.search)).not.toContain("Alice");
  });

  it("keeps local topics and profiles visible when summaries fail", () => {
    const view = buildSemanticDiscoveryView(baseInput({
      privacyOn: true,
      topics: {
        loading: false,
        error: null,
        data: {
          window: "7d",
          windowLabel: "Last 7 days",
          count: 42,
          truncated: true,
          topics: [{ topic: "release", count: 7, keywords: ["ship", "deadline"] }],
          daily: [{ date: "2026-06-04", count: 5 }],
          summary: "Synthetic private topic summary",
          summaryError: "summary provider unavailable",
        },
      },
      profile: {
        loading: false,
        error: null,
        data: {
          window: "7d",
          windowLabel: "Last 7 days",
          count: 42,
          truncated: false,
          profiles: [
            {
              sender: "wxid_sender",
              senderName: "Alice",
              messages: 11,
              topKeywords: [{ topic: "release", count: 4 }],
            },
          ],
          typeDistribution: [{ type: "text", count: 40 }],
          summary: "Synthetic private profile summary",
          summaryError: "profile summary failed",
        },
      },
    }));

    expect(view.topics.status).toBe("ready");
    expect(view.topics.summary).toBe("已隐藏总结");
    expect(view.topics.summaryError).toBe("summary provider unavailable");
    expect(view.topics.truncatedLabel).toBe("样本已截断");
    expect(view.topics.rows[0]).toMatchObject({
      label: "已隐藏话题",
      countLabel: "7 条",
      keywords: ["已隐藏关键词", "已隐藏关键词"],
    });
    expect(view.topics.dailyRows).toEqual([{ date: "2026-06-04", count: 5 }]);

    expect(view.profile.status).toBe("ready");
    expect(view.profile.summary).toBe("已隐藏总结");
    expect(view.profile.summaryError).toBe("profile summary failed");
    expect(view.profile.rows[0]).toMatchObject({
      sender: "wxid_sender",
      senderLabel: "已隐藏发送者",
      messagesLabel: "11 条消息",
      keywords: ["已隐藏关键词"],
    });
    expect(view.profile.typeRows).toEqual([{ type: "text", countLabel: "40 条" }]);
    expect(JSON.stringify(view)).not.toContain("Synthetic private");
    expect(JSON.stringify(view)).not.toContain("Alice");
  });
});

function baseInput(overrides: Partial<SemanticDiscoveryViewInput> = {}): SemanticDiscoveryViewInput {
  return {
    privacyOn: false,
    currentChatLabel: "Project Room",
    window: "7d",
    moduleReady: true,
    search: { query: "", loading: false, error: null, results: null },
    topics: { loading: false, error: null, data: null },
    profile: { loading: false, error: null, data: null },
    ...overrides,
  };
}
