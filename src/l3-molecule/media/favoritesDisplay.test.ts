import { describe, expect, it } from "vitest";
import type { AdaptedFavoriteItem } from "@l4/network/chatExtensionsAdapters";
import {
  formatFavoriteOrigin,
  formatFavoritePreview,
  getFavoriteEmptyMessage,
} from "./favoritesDisplay";

describe("favoritesDisplay", () => {
  it("shows favorite preview and origin outside privacy mode", () => {
    const item = favorite();

    expect(formatFavoritePreview(item, false)).toBe("Synthetic favorite preview");
    expect(formatFavoriteOrigin(item, false)).toBe("member_synthetic_guest · Synthetic Group");
  });

  it("masks favorite preview and origin in privacy mode", () => {
    const item = favorite();

    expect(formatFavoritePreview(item, true)).toBe("收藏内容已隐藏");
    expect(formatFavoriteOrigin(item, true)).toBe("来源已隐藏");
  });

  it("explains empty states by filter context", () => {
    expect(getFavoriteEmptyMessage("")).toBe("暂无收藏记录。");
    expect(getFavoriteEmptyMessage("synthetic")).toBe("没有匹配的收藏。");
  });
});

function favorite(): AdaptedFavoriteItem {
  return {
    id: "favorite_synthetic_001",
    type: "text",
    typeNum: 1,
    kindLabel: "文本",
    time: "2026-06-02 12:02",
    timestamp: 1800000002,
    preview: "Synthetic favorite preview",
    from: "member_synthetic_guest",
    chat: "Synthetic Group",
  };
}
