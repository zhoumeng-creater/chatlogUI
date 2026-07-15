import { describe, expect, it } from "vitest";
import messageListSource from "./MessageList.tsx?raw";

describe("MessageList", () => {
  it("auto-loads older history from the top instead of exposing a manual-only button", () => {
    expect(messageListSource).toContain("AUTO_LOAD_TOP_THRESHOLD");
    expect(messageListSource).toContain("onLoadMoreHistory(activeChat)");
    expect(messageListSource).toContain("message-list__history-status");
    expect(messageListSource).not.toContain("加载更早消息</Button>");
  });

  it("lets an explicit latest action supersede an in-flight older-history load", () => {
    expect(messageListSource).toContain("if (activeChat) onLoadHistory(activeChat)");
    expect(messageListSource).not.toContain("activeChat && !messagesLoading");
  });

  it("renders copy and selection results as a visible status, not only an aria announcer", () => {
    expect(messageListSource).toContain("message-list__status-toast");
    expect(messageListSource).toContain('role="status"');
  });
});
