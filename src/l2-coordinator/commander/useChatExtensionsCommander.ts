import { useCallback } from "react";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { fetchMembers, fetchNewMessages, fetchUnread } from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

export async function refreshUnreadIntoStore(): Promise<void> {
  useChatStore.getState().setUnreadLoading();

  try {
    const unread = await fetchUnread(
      { limit: 500 },
      createDiagnosticHttpOptions({
        endpointFamily: "unread",
        method: "GET",
        recoveryHint: "retry",
      }),
    );
    useChatStore.getState().mergeUnreadSessions(unread.sessions);
  } catch {
    useChatStore.getState().setUnreadError("加载未读会话失败");
  }
}

export async function loadMembersIntoStore(chat: string): Promise<void> {
  if (!chat) return;

  useChatStore.getState().setMembersLoading(chat);

  try {
    const members = await fetchMembers(
      { chat },
      createDiagnosticHttpOptions({
        endpointFamily: "members",
        method: "GET",
        recoveryHint: "retry",
      }),
    );
    useChatStore.getState().setMembers(members);
  } catch {
    useChatStore.getState().setMembersError("加载群成员失败");
  }
}

export async function refreshNewMessagesIntoStore(): Promise<void> {
  const state = useChatStore.getState().newMessagesState;
  useChatStore.getState().setNewMessagesLoading();

  try {
    const result = await fetchNewMessages(
      { limit: 200, state },
      createDiagnosticHttpOptions({
        endpointFamily: "new_messages",
        method: "GET",
        recoveryHint: "retry",
      }),
    );
    useChatStore.getState().mergeNewMessages(result.messages, result.newState);
  } catch {
    useChatStore.getState().setNewMessagesError("刷新新消息失败");
  }
}

export function useChatExtensionsCommander() {
  const store = useChatStore();

  const refreshUnread = useCallback(() => refreshUnreadIntoStore(), []);
  const loadMembers = useCallback((chat: string) => loadMembersIntoStore(chat), []);
  const refreshNewMessages = useCallback(() => refreshNewMessagesIntoStore(), []);

  return {
    unreadStatus: store.unreadStatus,
    unreadError: store.unreadError,
    membersStatus: store.membersStatus,
    membersError: store.membersError,
    activeMembersChat: store.activeMembersChat,
    membersByChat: store.membersByChat,
    newMessagesStatus: store.newMessagesStatus,
    newMessagesError: store.newMessagesError,
    newMessagesState: store.newMessagesState,
    newMessagesCount: store.newMessagesCount,
    refreshUnread,
    loadMembers,
    refreshNewMessages,
  };
}
