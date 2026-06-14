import { describe, expect, it } from "vitest";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import {
  buildMediaActionModel,
  createMediaCopySummary,
  createMediaOpenPrompt,
} from "./mediaActionModel";

describe("mediaActionModel", () => {
  it("keeps media copy summaries structural and redacts paths, resource keys, and URLs", () => {
    const summary = createMediaCopySummary(attachment({
      fileName: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private\\image.jpg",
      resourceKey: "secret-resource-key",
      directUrl: "http://127.0.0.1:5030/image/secret-resource-key",
      time: "2026-06-12 09:00",
      localId: 42,
    }), true);

    expect(summary).toContain("媒体类型: 图片");
    expect(summary).toContain("来源: 当前会话");
    expect(summary).toContain("文件: 已隐藏文件名");
    expect(summary).toContain("定位: 消息 42");
    expect(summary).not.toContain("C:\\Users");
    expect(summary).not.toContain("wxid_synthetic_private");
    expect(summary).not.toContain("secret-resource-key");
    expect(summary).not.toContain("127.0.0.1");
  });

  it("requires confirmation for original resource open and disables it in privacy mode", () => {
    const model = buildMediaActionModel({
      attachment: attachment({ resourceKey: "image-key", localId: 7 }),
      resourceUrl: "http://127.0.0.1:5030/image/image-key",
      privacyOn: true,
      resourceStatus: "ready",
    });

    expect(model.actions.find((action) => action.id === "openOriginal")).toMatchObject({
      enabled: false,
      disabledReason: "隐私模式下不打开原始资源。",
    });
    expect(model.actions.find((action) => action.id === "locateSource")).toMatchObject({
      enabled: true,
    });
  });

  it("rejects unsafe original URLs and creates a safe local-service prompt for valid resources", () => {
    expect(createMediaOpenPrompt({
      attachment: attachment({ resourceKey: "image-key" }),
      resourceUrl: "file:///C:/Users/Synthetic/private.jpg",
      privacyOn: false,
    })).toMatchObject({
      ok: false,
      reason: "仅支持打开本机 HTTP/HTTPS 媒体资源。",
    });

    expect(createMediaOpenPrompt({
      attachment: attachment({ resourceKey: "image-key" }),
      resourceUrl: "http://127.0.0.1:5030/image/image-key",
      privacyOn: false,
    })).toMatchObject({
      ok: true,
      prompt: expect.objectContaining({
        confirmLabel: "打开原始资源",
        redactedUrlLabel: "本机媒体资源",
      }),
    });
  });
});

function attachment(overrides: Partial<MediaAttachment>): MediaAttachment {
  return {
    id: "media-1",
    kind: "image",
    resourceKind: "image",
    resourceKey: "media-key",
    label: "图片",
    redactedEndpointLabel: "media:image",
    source: "history",
    ...overrides,
  };
}
