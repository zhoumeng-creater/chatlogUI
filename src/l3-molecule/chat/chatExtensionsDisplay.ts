import type { ChatMember, LoadStatus } from "@l2/data-clerk/stores/useChatStore";

export function formatMemberDisplay(member: ChatMember, privacyOn: boolean): string {
  const base = privacyOn ? "成员已隐藏" : member.display || member.username;
  return member.isOwner ? `${base}（群主）` : base;
}

export function formatNewMessagesStatus(status: LoadStatus, count: number): string {
  if (status === "loading") return "正在刷新新消息";
  if (status === "ready") return count > 0 ? `新增 ${count} 条消息` : "没有新消息";
  if (status === "empty") return "没有新消息";
  if (status === "error") return "新消息刷新失败";
  return "尚未刷新新消息";
}
