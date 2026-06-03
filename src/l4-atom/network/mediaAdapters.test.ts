import { describe, expect, it } from "vitest";
import { adaptMediaAttachments, getMediaAttachmentKindLabel } from "./mediaAdapters";
import type { RawHistoryMessage } from "./chatlogRawTypes";

describe("mediaAdapters", () => {
  it("creates image attachments from backend image keys without exposing raw keys as labels", () => {
    const raw: RawHistoryMessage = {
      type: "image",
      media_type: "image",
      image_keys: ["synthetic-image-key-a", "synthetic-image-key-b"],
      image_path: "C:/Synthetic/WeChat Files/image.dat",
    };

    const attachments = adaptMediaAttachments(raw, "history");

    expect(attachments).toHaveLength(2);
    expect(attachments[0]).toMatchObject({
      kind: "image",
      endpointFamily: "image",
      source: "history",
      label: "图片 1",
    });
    expect(JSON.stringify(attachments)).not.toContain("WeChat Files");
    expect(attachments.map((item) => item.fetchRef.key)).toEqual([
      "synthetic-image-key-a",
      "synthetic-image-key-b",
    ]);
  });

  it("creates a video attachment from media_key", () => {
    const attachments = adaptMediaAttachments(
      {
        type: "video",
        media_type: "video",
        media_key: "synthetic-video-key",
      },
      "search",
    );

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      kind: "video",
      endpointFamily: "video",
      source: "search",
      label: "视频",
    });
  });

  it("falls back to an unknown attachment for media messages without keys", () => {
    const attachments = adaptMediaAttachments({ type: "47", media_type: "sticker" }, "history");

    expect(attachments).toEqual([
      expect.objectContaining({
        kind: "sticker",
        endpointFamily: "image",
        label: "表情",
      }),
    ]);
    expect(attachments[0].fetchRef.key).toBe("");
  });

  it("returns no attachments for plain text messages", () => {
    expect(adaptMediaAttachments({ type: "text", content: "hello" }, "history")).toEqual([]);
  });

  it("provides stable Chinese labels for supported kinds", () => {
    expect(getMediaAttachmentKindLabel("image")).toBe("图片");
    expect(getMediaAttachmentKindLabel("video")).toBe("视频");
    expect(getMediaAttachmentKindLabel("voice")).toBe("语音");
    expect(getMediaAttachmentKindLabel("file")).toBe("文件");
  });
});
