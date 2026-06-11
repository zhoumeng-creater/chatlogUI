import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { MessageBubble } from "./MessageBubble";

const message: ChatMessage = {
  id: "message-42",
  localId: 42,
  timestamp: 1_714_288_000,
  time: "2024-04-28 09:20",
  sender: "Synthetic Sender",
  type: "text",
  content: "Synthetic private message body",
  chat: "Synthetic Chat",
  username: "wxid_synthetic_user",
  isGroup: false,
  chatType: "friend",
  direction: "unknown",
};

describe("MessageBubble", () => {
  it("marks search hit highlights without leaking private content into aria labels", () => {
    const html = renderToStaticMarkup(
      <MessageBubble message={message} privacyOn highlighted />,
    );

    expect(html).toContain("message-row--search-hit");
    expect(html).toContain('aria-label="搜索命中消息"');
    expect(html).not.toContain('aria-label="Synthetic private message body"');
  });
});
