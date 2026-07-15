import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionableEmptyStateView } from "@l2/commander/actionableEmptyStateModel";
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
        emptyStates={emptyStates()}
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
        emptyStates={emptyStates()}
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
        emptyStates={emptyStates()}
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
        emptyStates={emptyStates()}
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

  it("states the member display cap even when the loaded window is exactly full", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={Array.from({ length: 50 }, (_, index) => ({
          username: `member-${index}`,
          displayName: `Member ${index}`,
        }))}
        memberTotal={80}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="ready"
        error={null}
        endpointStatus={{
          ...emptyEndpointStatus(),
          members: { status: "ready", error: null },
        }}
        emptyStates={emptyStates()}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("当前仅展示前 50 位成员");
    expect(html).toContain("后端报告 80 位成员");
    expect(html).toContain("Member 49");
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
        emptyStates={emptyStates()}
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
        emptyStates={emptyStates()}
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

  it("renders filtered media actions, selected state, and open confirmation without raw resource keys", () => {
    const attachment = {
      id: "media-1",
      kind: "image" as const,
      resourceKind: "image" as const,
      resourceKey: "secret-key",
      label: "Synthetic image",
      redactedEndpointLabel: "media:image",
      source: "history" as const,
      sourceLabel: "当前会话",
      localId: 42,
      time: "2026-06-02 10:00",
    };
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[attachment]}
        filteredAttachments={[attachment]}
        filterChips={[{ id: "type", label: "类型", value: "图片" }]}
        selectedAttachmentIds={["media-1"]}
        actionModelsByAttachmentId={{
          "media-1": {
            attachmentId: "media-1",
            copySummary: "媒体类型: 图片",
            openPrompt: null,
            actions: [
              { id: "preview", label: "预览", enabled: true, disabledReason: null, requiresConfirmation: false },
              { id: "copySummary", label: "复制摘要", enabled: true, disabledReason: null, requiresConfirmation: false },
              { id: "locateSource", label: "定位来源", enabled: true, disabledReason: null, requiresConfirmation: false },
              { id: "openOriginal", label: "打开原始资源", enabled: true, disabledReason: null, requiresConfirmation: true },
              {
                id: "retryResource",
                label: "重试资源",
                enabled: false,
                disabledReason: "资源未处于失败状态。",
                requiresConfirmation: false,
              },
            ],
          },
        }}
        actionPrompt={{
          attachmentId: "media-1",
          title: "打开原始资源",
          message: "将通过系统浏览器打开本机 chatlog 媒体资源。",
          confirmLabel: "打开原始资源",
          cancelLabel: "取消",
          url: "http://127.0.0.1:5030/image/secret-key",
          redactedUrlLabel: "本机媒体资源",
        }}
        lastActionResult={{ status: "success", message: "已复制媒体摘要。" }}
        favorites={[]}
        members={[]}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="ready"
        error={null}
        endpointStatus={emptyEndpointStatus()}
        emptyStates={emptyStates()}
        selectedAttachment={null}
        previewResourceUrl=""
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("媒体筛选");
    expect(html).toContain("清除类型筛选");
    expect(html).toContain("取消选择媒体");
    expect(html).toContain("打开原始资源");
    expect(html).toContain("本机媒体资源");
    expect(html).toContain("已复制媒体摘要");
    expect(html).not.toContain("secret-key");
  });

  it("keeps privacy-mode media action success announcements action-specific", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={true}
        attachments={[]}
        favorites={[]}
        members={[]}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="empty"
        error={null}
        endpointStatus={emptyEndpointStatus()}
        emptyStates={emptyStates()}
        selectedAttachment={null}
        previewResourceUrl=""
        lastActionResult={{ status: "success", message: "已复制媒体摘要。" }}
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );

    expect(html).toContain("已复制媒体摘要。");
    expect(html).not.toContain("媒体操作完成");
  });

  it("renders the original-open confirmation as a modal safe-focus dialog", () => {
    const html = renderToStaticMarkup(
      <MediaLibrary
        currentChat="synthetic_room"
        privacyOn={false}
        attachments={[]}
        favorites={[]}
        members={[]}
        unread={{ total: 0, chats: [] }}
        newMessages={[]}
        status="ready"
        error={null}
        endpointStatus={emptyEndpointStatus()}
        emptyStates={emptyStates()}
        selectedAttachment={null}
        previewResourceUrl=""
        actionPrompt={{
          attachmentId: "media-1",
          title: "打开原始资源",
          message: "将通过系统浏览器打开本机 chatlog 媒体资源。",
          confirmLabel: "打开原始资源",
          cancelLabel: "取消",
          url: "http://127.0.0.1:5030/image/secret-key",
          redactedUrlLabel: "本机媒体资源",
        }}
        onRetry={vi.fn()}
        onPreviewAttachment={vi.fn()}
        onClosePreview={vi.fn()}
      />,
    );
    const promptHtml = html.slice(html.indexOf('role="dialog"'));

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('class="spring-modal__backdrop"');
    expect(html).toContain('class="spring-modal__panel"');
    expect(html).toContain('aria-labelledby="media-open-prompt-title"');
    expect(html).toContain('id="media-open-prompt-title"');
    expect(html).toContain('tabindex="-1"');
    expect(promptHtml).toContain("ui-button--md");
    expect(promptHtml).not.toContain("ui-button--sm");
    expect(promptHtml.indexOf(">取消</button>")).toBeLessThan(promptHtml.indexOf(">打开原始资源</button>"));
    expect(promptHtml).not.toContain("secret-key");
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

function emptyStates(): { noConversation: ActionableEmptyStateView } {
  return {
    noConversation: {
      id: "no-conversation-selected",
      title: "选择会话",
      reason: "还没有选中要阅读的会话。",
      description: "打开会话后显示附件、收藏、成员、未读和增量消息。",
      actions: [
        {
          id: "choose-conversation",
          label: "选择会话",
          variant: "secondary",
          disabled: false,
          disabledReason: null,
        },
      ],
    },
  };
}
