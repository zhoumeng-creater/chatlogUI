import { describe, expect, it } from "vitest";
import { resolveSemanticSearchNavigation } from "./semanticDiscoveryNavigation";

describe("semanticDiscoveryNavigation", () => {
  const conversations = [
    { id: "conv-1", username: "wxid_backend_chat", displayName: "Project Room" },
    { id: "conv-2", username: "wxid_other", displayName: "wxid_backend_chat" },
  ];

  it("resolves result clicks by backend username and preserves the local message target", () => {
    const target = resolveSemanticSearchNavigation({
      result: {
        chat: "wxid_backend_chat",
        chatLabel: "A display label that must not be used as chat id",
        localId: 123,
      },
      conversations,
      privacyOn: false,
    });

    expect(target).toEqual({
      status: "ready",
      conversationId: "conv-1",
      chat: "wxid_backend_chat",
      localId: 123,
      message: "已打开 Project Room，可在当前聊天中查看上下文。",
    });
  });

  it("returns a privacy-safe missing-target message", () => {
    const target = resolveSemanticSearchNavigation({
      result: { chat: "wxid_missing", chatLabel: "Private room", localId: 5 },
      conversations,
      privacyOn: true,
    });

    expect(target).toEqual({
      status: "missing",
      conversationId: "",
      chat: "wxid_missing",
      localId: 5,
      message: "未在当前会话列表中找到该语义结果来源。",
    });
    expect(JSON.stringify(target)).not.toContain("Private room");
  });
});
