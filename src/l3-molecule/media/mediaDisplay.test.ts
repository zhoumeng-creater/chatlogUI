import { describe, expect, it } from "vitest";
import type { MediaAttachment, MediaFavoriteItem, MediaMember } from "@l2/data-clerk/stores/useMediaStore";
import {
  formatAttachmentLabel,
  formatFavoritePreview,
  formatMemberDisplayName,
  summarizeMediaCounts,
} from "./mediaDisplay";

const attachment: MediaAttachment = {
  id: "a1",
  kind: "image",
  resourceKind: "image",
  resourceKey: "raw-secret-key",
  label: "图片",
  redactedEndpointLabel: "media:image",
  source: "history",
};

describe("mediaDisplay", () => {
  it("keeps media labels useful while hiding keys in privacy mode", () => {
    expect(formatAttachmentLabel(attachment, false)).toBe("图片");
    expect(formatAttachmentLabel(attachment, true)).toBe("已隐藏媒体");
    expect(formatAttachmentLabel(attachment, true)).not.toContain("raw-secret-key");
  });

  it("summarizes attachment counts by kind", () => {
    expect(summarizeMediaCounts([
      attachment,
      { ...attachment, id: "a2", kind: "file", label: "文件" },
      { ...attachment, id: "a3", kind: "file", label: "文件" },
    ])).toEqual([
      { label: "图片", count: 1 },
      { label: "文件", count: 2 },
    ]);
  });

  it("masks favorites and member identities in privacy mode", () => {
    const favorite: MediaFavoriteItem = {
      id: "fav",
      chat: "wxid_synthetic_chat",
      sender: "Alice",
      time: "2026-06-02 10:00",
      type: "image",
      content: "saved private photo",
      attachments: [attachment],
    };
    const member: MediaMember = {
      username: "wxid_synthetic_member",
      displayName: "Alice",
    };

    expect(formatFavoritePreview(favorite, false)).toContain("saved private photo");
    expect(formatFavoritePreview(favorite, true)).toBe("已隐藏收藏内容");
    expect(formatMemberDisplayName(member, false)).toBe("Alice");
    expect(formatMemberDisplayName(member, true)).toBe("已隐藏成员");
  });
});
