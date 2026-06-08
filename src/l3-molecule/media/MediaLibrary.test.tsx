import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MediaLibrary } from "./MediaLibrary";

describe("MediaLibrary", () => {
  it("explains why refresh is disabled before a conversation is selected", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat=""
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={[]}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="idle"
        error={null}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("ui-disabled-reason--sr-only");
    expect(html).toContain("先选择一个会话");
    expect(html).toContain("选择会话后可刷新媒体与扩展");
  });
});
