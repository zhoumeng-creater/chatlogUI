import type { SemanticPreviewRowView } from "@l2/commander/semanticPreviewViewModel";

export function formatSemanticPreviewIdentity(row: Pick<SemanticPreviewRowView, "identityLabel">, privacyOn: boolean): string {
  return privacyOn ? "已隐藏对象" : row.identityLabel || "未知对象";
}

export function formatSemanticPreviewContent(row: Pick<SemanticPreviewRowView, "contentPreview">, privacyOn: boolean): string {
  return privacyOn ? "已隐藏内容" : row.contentPreview || "无内容摘要";
}
