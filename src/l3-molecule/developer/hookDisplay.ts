import type { HookEventRowView } from "@l2/commander/hookViewModel";
import type { HermesQQDraft, HermesWeixinDraft } from "@l4/network";

export function formatHookIdentity(row: Pick<HookEventRowView, "identityLabel">, privacyOn: boolean): string {
  return privacyOn ? "已隐藏对象" : row.identityLabel || "未知对象";
}

export function formatHookContent(row: Pick<HookEventRowView, "contentPreview">, privacyOn: boolean): string {
  return privacyOn ? "已隐藏内容" : row.contentPreview || "无内容摘要";
}

export function formatHookClearButtonCopy(clearConfirmationPending: boolean): string {
  return clearConfirmationPending ? "确认清空" : "清空事件";
}

export function isHermesWeixinDraftComplete(draft: HermesWeixinDraft): boolean {
  return [
    draft.hermesHome,
    draft.accountId,
    draft.token,
    draft.baseUrl,
    draft.cdnBaseUrl,
    draft.homeChannel,
    draft.homeChannelName,
  ].every(hasText);
}

export function isHermesQQDraftComplete(draft: HermesQQDraft): boolean {
  return [
    draft.hermesHome,
    draft.appId,
    draft.clientSecret,
    draft.homeChannel,
    draft.homeChannelName,
  ].every(hasText);
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
