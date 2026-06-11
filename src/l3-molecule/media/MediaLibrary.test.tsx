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
        endpointStatus={emptyEndpointStatus()}
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

  it("keeps usable media tabs visible when one endpoint fails", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={[]}
        unread={{ total: 2, chats: [{ chat: "synthetic_room", count: 2 }] }}
        newMessages={[]}
        status="partial"
        error="部分媒体扩展加载失败"
        endpointStatus={{
          ...emptyEndpointStatus(),
          favorites: { status: "error", error: "收藏加载失败" },
          unread: { status: "ready", error: null },
        }}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("部分媒体扩展加载失败");
    expect(html).toContain("其他内容仍可查看");
    expect(html).toContain("收藏加载失败");
    expect(html).toContain("未读 2");
  });

  it("states media tab limitations instead of rendering dead unread or new-message rows", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={[]}
        unread={{ total: 2, chats: [{ chat: "synthetic_room", count: 2 }] }}
        newMessages={[{
          id: "message-1",
          chat: "synthetic_room",
          sender: "synthetic_sender",
          content: "Synthetic new message",
          time: "2026-01-02 09:00",
          attachments: [],
        }]}
        status="ready"
        error={null}
        endpointStatus={{
          ...emptyEndpointStatus(),
          unread: { status: "ready", error: null },
          newMessages: { status: "ready", error: null },
        }}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("当前接口未返回可定位消息锚点");
    expect(html).toContain("未读与增量消息暂按摘要展示");
  });

  it("caps large member lists and explains the display boundary", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={Array.from({ length: 55 }, (_, index) => ({
          username: `member-${index}`,
          displayName: `Member ${index}`,
        }))}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="ready"
        error={null}
        endpointStatus={{
          ...emptyEndpointStatus(),
          members: { status: "ready", error: null },
        }}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("仅展示前 50 位成员");
    expect(html).toContain("Member 49");
    expect(html).not.toContain("Member 50");
  });
});

function emptyEndpointStatus() {
  return {
    favorites: { status: "idle" as const, error: null },
    members: { status: "idle" as const, error: null },
    unread: { status: "idle" as const, error: null },
    newMessages: { status: "idle" as const, error: null },
  };
}
