import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { MessageBubble } from "./MessageBubble";
import messageBubbleSource from "./MessageBubble.tsx?raw";

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

  it("keeps selection inside the row more-actions menu instead of a separate visible button", () => {
    const html = renderToStaticMarkup(
      <MessageBubble message={message} privacyOn={false} />,
    );

    expect(html).toContain("选择消息");
    expect(html).not.toContain("message-bubble__select-mode");
    expect(html).not.toContain(">选择</button>");
  });

  it("renders available attachments as clickable preview chips", () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={{
          ...message,
          attachments: [{
            id: "attachment-1",
            kind: "image",
            resourceKind: "image",
            resourceKey: "image-key",
            label: "图片",
            redactedEndpointLabel: "media:image",
            source: "history",
          }],
        }}
        privacyOn={false}
        getAttachmentPreviewModel={(attachment) => ({
          id: attachment.id,
          label: "图片",
          kind: "image",
          kindLabel: "图片",
          resourceUrl: "http://127.0.0.1:5030/image/image-key",
          canPreview: true,
          disabledReason: null,
        })}
      />,
    );

    expect(html).toContain("message-attachment-card--button");
    expect(html).toContain('aria-label="打开图片附件"');
    expect(html).not.toContain("2 个附件：媒体");
  });

  it("renders repeated attachment candidates as one preview chip", () => {
    const attachments = [
      {
        id: "attachment-1",
        kind: "image" as const,
        resourceKind: "image" as const,
        resourceKey: "same-image-key",
        label: "图片",
        redactedEndpointLabel: "media:image",
        source: "history" as const,
        localId: 42,
      },
      {
        id: "attachment-2",
        kind: "image" as const,
        resourceKind: "image" as const,
        resourceKey: "same-image-key",
        label: "图片",
        redactedEndpointLabel: "media:image",
        source: "history" as const,
        localId: 42,
      },
    ];

    const html = renderToStaticMarkup(
      <MessageBubble
        message={{
          ...message,
          attachments,
        }}
        privacyOn={false}
        getAttachmentPreviewModel={(attachment) => ({
          id: attachment.id,
          label: "图片",
          kind: "image",
          kindLabel: "图片",
          resourceUrl: `http://127.0.0.1:5030/image/${attachment.resourceKey}`,
          canPreview: true,
          disabledReason: null,
        })}
      />,
    );

    expect(html.match(/message-attachment-card--button/g) ?? []).toHaveLength(1);
  });

  it("keeps unsupported media chips clickable so the preview can explain the state", () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={{
          ...message,
          attachments: [{
            id: "attachment-file",
            kind: "file",
            resourceKind: "file",
            resourceKey: "",
            label: "文件",
            redactedEndpointLabel: "media:file",
            source: "history",
          }],
        }}
        privacyOn={false}
        getAttachmentPreviewModel={(attachment) => ({
          id: attachment.id,
          label: "文件",
          kind: "file",
          kindLabel: "文件",
          resourceUrl: "",
          canPreview: false,
          disabledReason: "当前附件没有可预览资源。",
        })}
      />,
    );

    expect(html).toContain("message-attachment-card--button");
    expect(html).toContain('aria-label="查看文件附件状态"');
    expect(html).not.toContain("disabled");
  });

  it("defines a designed video preview stage with failure recovery copy", () => {
    expect(messageBubbleSource).toContain("chat-media-preview__stage");
    expect(messageBubbleSource).toContain('preload="metadata"');
    expect(messageBubbleSource).toContain("媒体加载失败");
    expect(messageBubbleSource).toContain("该资源可能尚未解密、已被移动，或当前格式不受系统播放器支持。");
  });
});
