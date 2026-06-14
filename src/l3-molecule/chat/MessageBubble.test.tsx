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
  senderName: "Synthetic Sender",
  talker: "Synthetic Chat",
  talkerName: "Synthetic Chat",
  isSelf: false,
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

  it("renders group sender display from senderName and masks it in privacy mode", () => {
    const groupMessage: ChatMessage = {
      ...message,
      isGroup: true,
      direction: "other",
      sender: "wxid_synthetic_member",
      senderName: "Synthetic Group Member",
    };

    const visible = renderToStaticMarkup(
      <MessageBubble message={groupMessage} privacyOn={false} />,
    );
    const masked = renderToStaticMarkup(
      <MessageBubble message={groupMessage} privacyOn />,
    );

    expect(visible).toContain("Synthetic Group Member");
    expect(masked).not.toContain("Synthetic Group Member");
    expect(masked).toContain("********* ***** ******");
  });
});
