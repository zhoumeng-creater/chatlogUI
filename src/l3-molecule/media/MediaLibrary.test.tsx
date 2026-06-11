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

  it("previews favorite attachments through the media sheet and degrades text-only favorites honestly", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[
          {
            id: "favorite-with-attachment",
            chat: "synthetic_room",
            sender: "synthetic_sender",
            time: "2026-01-02 09:00",
            type: "image",
            content: "",
            attachments: [{
              id: "favorite-media",
              kind: "image",
              resourceKind: "image",
              resourceKey: "synthetic-private-key",
              label: "Favorite image",
              redactedEndpointLabel: "media:image",
              source: "favorite",
            }],
          },
          {
            id: "favorite-text",
            chat: "synthetic_room",
            sender: "synthetic_sender",
            time: "2026-01-02 09:01",
            type: "text",
            content: "Synthetic saved text",
            attachments: [],
          },
        ]}
        members={[]}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="ready"
        error={null}
        endpointStatus={{
          ...emptyEndpointStatus(),
          favorites: { status: "ready", error: null },
        }}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("预览附件");
    expect(html).toContain("Favorite image");
    expect(html).toContain("收藏没有可用媒体预览");
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain("synthetic-private-key");
  });

  it("labels member search as local to loaded members", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={[
          { username: "member-a", displayName: "Member A" },
          { username: "member-b", displayName: "Member B" },
        ]}
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

    expect(html).toContain("搜索已加载成员");
    expect(html).toContain("成员搜索仅筛选已加载成员");
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
