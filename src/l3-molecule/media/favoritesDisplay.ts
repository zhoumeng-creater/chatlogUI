import type { AdaptedFavoriteItem } from "@l4/network/chatExtensionsAdapters";

export function formatFavoritePreview(item: AdaptedFavoriteItem, privacyOn: boolean): string {
  if (privacyOn) return "收藏内容已隐藏";
  return item.preview || `[${item.kindLabel}]`;
}

export function formatFavoriteOrigin(item: AdaptedFavoriteItem, privacyOn: boolean): string {
  if (privacyOn) return "来源已隐藏";

  const parts = [item.from, item.chat].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "未知来源";
}

export function getFavoriteEmptyMessage(query: string): string {
  return query.trim() ? "没有匹配的收藏。" : "暂无收藏记录。";
}
