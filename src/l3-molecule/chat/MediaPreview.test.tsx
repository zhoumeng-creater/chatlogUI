import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HistoryMessage } from "@l2/api-docs/history";
import { MediaPreview } from "./MediaPreview";

describe("MediaPreview", () => {
  it("shows an explicit close control inside the media dialog", () => {
    const html = renderToStaticMarkup(
      <MediaPreview message={historyMessage()} onClose={vi.fn()} />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="关闭媒体预览"');
    expect(html).toContain("ui-icon-button--lg");
  });
});

function historyMessage(): HistoryMessage {
  return {
    seq: 1,
    id: "message-1",
    time: "2026-06-09T10:00:00.000Z",
    talker: "synthetic-chat",
    sender: "synthetic-sender",
    isSelf: false,
    type: 3,
    subType: 0,
    content: "",
    mediaMsg: "",
    mediaUrl: "/api/v1/image/synthetic",
    chat: "synthetic-chat",
    username: "synthetic-chat",
    isGroup: false,
    chatType: "single",
  };
}
