import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import { MediaActionMenu } from "./MediaActionMenu";

describe("MediaActionMenu", () => {
  it("renders icon actions with disabled reasons instead of raw resource links", () => {
    const html = renderToStaticMarkup(
      <MediaActionMenu
        attachment={attachment()}
        model={{
          attachmentId: "media-1",
          copySummary: "媒体类型: 图片",
          openPrompt: null,
          actions: [
            { id: "preview", label: "预览", enabled: true, disabledReason: null, requiresConfirmation: false },
            { id: "copySummary", label: "复制摘要", enabled: true, disabledReason: null, requiresConfirmation: false },
            { id: "locateSource", label: "定位来源", enabled: true, disabledReason: null, requiresConfirmation: false },
            {
              id: "openOriginal",
              label: "打开原始资源",
              enabled: false,
              disabledReason: "隐私模式下不打开原始资源。",
              requiresConfirmation: true,
            },
            {
              id: "retryResource",
              label: "重试资源",
              enabled: false,
              disabledReason: "资源未处于失败状态。",
              requiresConfirmation: false,
            },
          ],
        }}
        selected={false}
        onPreview={vi.fn()}
        onCopySummary={vi.fn()}
        onLocateSource={vi.fn()}
        onRequestOpenOriginal={vi.fn()}
        onRetryResource={vi.fn()}
        onToggleSelected={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="预览媒体"');
    expect(html).toContain('aria-label="复制媒体摘要"');
    expect(html).toContain('aria-label="打开原始资源"');
    expect(html).toContain("隐私模式下不打开原始资源");
    expect(html).not.toContain('href="http://127.0.0.1');
    expect(html).not.toContain("secret-key");
  });
});

function attachment(): MediaAttachment {
  return {
    id: "media-1",
    kind: "image",
    resourceKind: "image",
    resourceKey: "secret-key",
    label: "Synthetic image",
    redactedEndpointLabel: "media:image",
    source: "history",
    localId: 10,
  };
}
