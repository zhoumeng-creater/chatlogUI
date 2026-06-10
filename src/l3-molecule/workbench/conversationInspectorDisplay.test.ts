import { describe, expect, it } from "vitest";
import { deriveConversationInspectorView } from "./conversationInspectorDisplay";

describe("conversationInspectorDisplay", () => {
  it("shows a clear no-conversation state", () => {
    expect(
      deriveConversationInspectorView({
        conversation: null,
        currentChat: "",
        stats: null,
        statsLoading: false,
        statsError: null,
        mediaCount: 0,
        semanticLabel: null,
        graphLabel: null,
        privacyOn: false,
      }),
    ).toMatchObject({
      title: "会话详情",
      state: "empty",
      heading: "选择会话",
      body: "打开会话后显示上下文摘要和相关入口。",
    });
  });

  it("summarizes the selected conversation without exposing content in privacy mode", () => {
    const view = deriveConversationInspectorView({
      conversation: {
        displayName: "Alice",
        typeLabel: "单聊",
      },
      currentChat: "wxid_private_alice",
      stats: {
        messageCount: 42,
        activeSenders: 2,
        mediaCount: 7,
      },
      statsLoading: false,
      statsError: null,
      mediaCount: 3,
      semanticLabel: "AI ready",
      graphLabel: "已加载",
      privacyOn: true,
    });

    expect(view.state).toBe("summary");
    expect(view.heading).toBe("已隐藏会话");
    expect(view.sections.map((section) => section.title)).toEqual([
      "当前会话",
      "当前会话统计",
      "相关能力",
    ]);
    expect(JSON.stringify(view)).not.toContain("Alice");
    expect(JSON.stringify(view)).not.toContain("wxid_private_alice");
  });

  it("keeps stats loading and error as local inspector states", () => {
    expect(
      deriveConversationInspectorView({
        conversation: { displayName: "群聊", typeLabel: "群聊" },
        currentChat: "chatroom",
        stats: null,
        statsLoading: true,
        statsError: null,
        mediaCount: 0,
        semanticLabel: null,
        graphLabel: null,
        privacyOn: false,
      }).sections.find((section) => section.title === "当前会话统计")?.status,
    ).toBe("loading");

    expect(
      deriveConversationInspectorView({
        conversation: { displayName: "群聊", typeLabel: "群聊" },
        currentChat: "chatroom",
        stats: null,
        statsLoading: false,
        statsError: "统计加载失败",
        mediaCount: 0,
        semanticLabel: null,
        graphLabel: null,
        privacyOn: false,
      }).sections.find((section) => section.title === "当前会话统计")?.status,
    ).toBe("error");
  });
});
