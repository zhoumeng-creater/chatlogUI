import { describe, expect, it } from "vitest";
import type { MediaAttachment } from "@l4/network/mediaAdapters";
import {
  formatAttachmentAriaLabel,
  formatAttachmentPrimaryText,
  formatMediaPreviewStateLabel,
} from "./mediaDisplay";

describe("mediaDisplay", () => {
  it("formats attachment labels without raw keys", () => {
    const attachment = mediaAttachment();

    expect(formatAttachmentPrimaryText(attachment, false)).toBe("图片");
    expect(formatAttachmentAriaLabel(attachment, false)).toBe("打开图片媒体");
    expect(JSON.stringify({
      text: formatAttachmentPrimaryText(attachment, false),
      aria: formatAttachmentAriaLabel(attachment, false),
    })).not.toContain("synthetic-image-key");
  });

  it("masks attachment labels structurally in privacy mode", () => {
    const attachment = mediaAttachment();

    expect(formatAttachmentPrimaryText(attachment, true)).toBe("媒体：图片");
    expect(formatAttachmentAriaLabel(attachment, true)).toBe("打开已隐藏媒体，类型图片");
  });

  it("formats preview status labels", () => {
    expect(formatMediaPreviewStateLabel("loading", "图片")).toBe("正在加载图片");
    expect(formatMediaPreviewStateLabel("error", "图片")).toBe("图片加载失败");
    expect(formatMediaPreviewStateLabel("ready", "图片")).toBe("图片预览");
  });
});

function mediaAttachment(): MediaAttachment {
  return {
    id: "attachment-1",
    kind: "image",
    source: "history",
    endpointFamily: "image",
    label: "图片",
    fetchRef: {
      endpointFamily: "image",
      key: "synthetic-image-key",
    },
  };
}
