import { describe, expect, it } from "vitest";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import {
  createDefaultMediaFilters,
  filterMediaAttachments,
  formatMediaFilterSummary,
} from "./mediaFilterModel";

describe("mediaFilterModel", () => {
  it("filters loaded media by type, availability, source, and date without exposing private labels", () => {
    const result = filterMediaAttachments(
      [
        attachment({
          id: "image-ready",
          kind: "image",
          resourceKey: "secret-image-key",
          source: "history",
          time: "2026-06-12 09:00",
          label: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private\\image.jpg",
        }),
        attachment({
          id: "video-missing",
          kind: "video",
          resourceKey: "",
          source: "favorite",
          time: "2026-06-12 10:00",
          label: "private video",
        }),
        attachment({
          id: "voice-ready",
          kind: "voice",
          resourceKey: "voice-key",
          source: "new_message",
          time: "2026-05-01 10:00",
        }),
      ],
      {
        ...createDefaultMediaFilters(),
        type: "image",
        availability: "available",
        source: "history",
        dateRange: { start: "2026-06-01", end: "2026-06-30" },
      },
      ["image-ready", "video-missing"],
    );

    expect(result.visibleAttachments.map((item) => item.id)).toEqual(["image-ready"]);
    expect(result.selectedAttachmentIds).toEqual(["image-ready"]);
    expect(result.filteredOutCount).toBe(2);
    expect(result.activeChips.map((chip) => chip.value)).toEqual([
      "图片",
      "当前会话",
      "可预览",
      "2026-06-01 到 2026-06-30",
    ]);
    expect(JSON.stringify(result.activeChips)).not.toContain("C:\\Users");
    expect(JSON.stringify(result.activeChips)).not.toContain("wxid_synthetic_private");
  });

  it("summarizes default and filtered views for export metadata", () => {
    expect(formatMediaFilterSummary(createDefaultMediaFilters())).toEqual(["媒体筛选：无"]);

    expect(formatMediaFilterSummary({
      type: "file",
      source: "favorite",
      availability: "missing",
      dateRange: { start: "2026-06-01", end: "" },
    })).toEqual([
      "类型：文件",
      "来源：收藏",
      "状态：资源缺失",
      "时间：2026-06-01 之后",
    ]);
  });
});

function attachment(overrides: Partial<MediaAttachment>): MediaAttachment {
  return {
    id: "media",
    kind: "image",
    resourceKind: "image",
    resourceKey: "media-key",
    label: "图片",
    redactedEndpointLabel: "media:image",
    source: "history",
    ...overrides,
  };
}
