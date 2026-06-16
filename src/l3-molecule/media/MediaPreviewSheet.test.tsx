import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MediaPreviewSheet } from "./MediaPreviewSheet";
import type { MediaActionModel } from "@l2/commander/mediaActionModel";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";

describe("MediaPreviewSheet", () => {
  it("uses the shared icon command pattern for closing media preview", () => {
    const html = renderToStaticMarkup(
      <MediaPreviewSheet
        attachment={attachment()}
        resourceUrl="/api/v1/media/synthetic"
        privacyOn={false}
        onClose={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain('aria-label="关闭媒体预览"');
    expect(html).toContain('role="tooltip"');
    expect(html).not.toContain("title=");
  });

  it("renders as a modal dialog with a close target sized for overlays", () => {
    const html = renderToStaticMarkup(
      <MediaPreviewSheet
        attachment={attachment()}
        resourceUrl="/api/v1/media/synthetic"
        privacyOn={false}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-labelledby="media-preview-title"');
    expect(html).toContain('id="media-preview-title"');
    expect(html).toContain("ui-icon-button--lg");
    expect(html).not.toContain("ui-icon-button--sm");
  });

  it("does not open file attachments through a raw new-window link", () => {
    const html = renderToStaticMarkup(
      <MediaPreviewSheet
        attachment={{ ...attachment(), kind: "file", resourceKind: "file", label: "文件" }}
        resourceUrl="/api/v1/file/synthetic"
        privacyOn={false}
        onClose={vi.fn()}
      />,
    );

    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain("media-preview-sheet__link");
    expect(html).toContain("文件附件暂不支持直接预览");
  });

  it("disables the nested preview action while the preview sheet is already open", () => {
    const html = renderToStaticMarkup(
      <MediaPreviewSheet
        attachment={attachment()}
        resourceUrl="/api/v1/media/synthetic"
        privacyOn={false}
        actionModel={actionModel()}
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="预览媒体"');
    expect(html).toContain("当前已在预览中。");
    expect(html).toContain("disabled=");
  });
});

function attachment(): MediaAttachment {
  return {
    id: "media-1",
    kind: "image",
    resourceKind: "image",
    resourceKey: "synthetic-key",
    label: "Synthetic image",
    redactedEndpointLabel: "media image",
    source: "history",
  };
}

function actionModel(): MediaActionModel {
  return {
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
        enabled: true,
        disabledReason: null,
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
  };
}
