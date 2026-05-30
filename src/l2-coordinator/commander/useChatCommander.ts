import { useCallback, useRef } from "react";
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { fetchConversations, fetchHistory } from "@l4/network";

const HISTORY_PAGE_SIZE = 50;

function hasMoreHistory(result: { count: number; limit: number; messages: unknown[] }) {
  const loadedCount = result.count || result.messages.length;
  return result.limit > 0 && loadedCount >= result.limit;
}

export function useChatCommander() {
  const store = useChatStore();
  const loadingRef = useRef(false);

  const loadConversations = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    useChatStore.getState().setConversationsLoading();
    try {
      const { conversations, contacts, chatrooms } = await fetchConversations({ limit: 500 });

      const contactsByUsername: Record<string, unknown> = {};
      for (const c of (contacts.contacts ?? [])) {
        contactsByUsername[c.username] = c;
      }

      const chatRoomsByName: Record<string, unknown> = {};
      for (const r of (chatrooms.chatrooms ?? [])) {
        chatRoomsByName[r.name] = r;
      }

      useChatStore.getState().setConversations(conversations, contactsByUsername, chatRoomsByName);
    } catch {
      useChatStore.getState().setConversationsError("加载会话列表失败");
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const loadHistory = useCallback(async (chat: string) => {
    useChatStore.getState().setMessagesLoading(true);
    try {
      const result = await fetchHistory({ chat, limit: HISTORY_PAGE_SIZE, offset: 0 });
      useChatStore.getState().setMessages(
        result.messages,
        result.totalCount,
        result.offset,
        hasMoreHistory(result),
      );
    } catch {
      useChatStore.getState().setMessagesError("加载聊天记录失败");
    }
  }, []);

  const loadMoreHistory = useCallback(async (chat: string) => {
    const { messages, messagesLoading, messagesHasMore } = useChatStore.getState();
    if (messagesLoading || !messagesHasMore) return;

    useChatStore.getState().setMessagesLoading(true);
    const nextOffset = messages.length;

    try {
      const result = await fetchHistory({ chat, limit: HISTORY_PAGE_SIZE, offset: nextOffset });
      useChatStore.getState().appendMessages(result.messages, result.offset, hasMoreHistory(result));
    } catch {
      useChatStore.getState().setMessagesError("加载更多记录失败");
    }
  }, []);

  const selectAndLoad = useCallback(
    async (convId: string, chat: string) => {
      useChatStore.getState().selectConversation(convId);
      await loadHistory(chat);
    },
    [loadHistory],
  );

  return {
    ...store,
    loadConversations,
    loadHistory,
    loadMoreHistory,
    selectAndLoad,
  };
}
