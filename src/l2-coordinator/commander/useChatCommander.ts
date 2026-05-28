import { useCallback } from "react";
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { fetchContacts, fetchChatRooms } from "@l4/network";
import { fetchHistory } from "@l4/network";

const HISTORY_PAGE_SIZE = 50;

export function useChatCommander() {
  const store = useChatStore();

  const loadContacts = useCallback(async () => {
    useChatStore.setState({ contactsLoading: true });
    try {
      const [contactsData, chatRoomsData] = await Promise.all([
        fetchContacts(),
        fetchChatRooms(),
      ]);
      useChatStore.getState().setContacts(
        contactsData.contacts,
        contactsData.sessions,
        chatRoomsData,
      );
    } catch {
      useChatStore.setState({ contactsLoading: false });
      throw new Error("加载联系人失败");
    }
  }, []);

  const loadHistory = useCallback(async (chat: string, _isGroup: boolean) => {
    useChatStore.setState({ messagesLoading: true });
    try {
      const result = await fetchHistory({ chat, limit: HISTORY_PAGE_SIZE, offset: 0 });
      useChatStore.getState().setMessages(result.messages, result.totalCount, 0);
    } catch {
      useChatStore.setState({ messagesLoading: false });
      throw new Error("加载聊天记录失败");
    }
  }, []);

  const loadMoreHistory = useCallback(async (chat: string) => {
    const { messagesOffset, messages, messagesTotalCount } = useChatStore.getState();
    if (messages.length >= messagesTotalCount) return;

    const nextOffset = messagesOffset + HISTORY_PAGE_SIZE;
    useChatStore.setState({ messagesLoading: true });

    try {
      const result = await fetchHistory({ chat, limit: HISTORY_PAGE_SIZE, offset: nextOffset });
      useChatStore.getState().appendMessages(result.messages, nextOffset);
    } catch {
      useChatStore.setState({ messagesLoading: false });
      throw new Error("加载更多记录失败");
    }
  }, []);

  const selectAndLoad = useCallback(
    async (userName: string, nickName: string, isGroup: boolean) => {
      if (isGroup) {
        const chatRoom = { name: userName, nickName, owner: "", users: [], remark: "" };
        useChatStore.getState().selectChatRoom(chatRoom);
      } else {
        const contact = { userName, nickName, alias: "", remark: "", isFriend: true };
        useChatStore.getState().selectContact(contact);
      }
      await loadHistory(userName, isGroup);
    },
    [loadHistory],
  );

  return {
    ...store,
    loadContacts,
    loadHistory,
    loadMoreHistory,
    selectAndLoad,
  };
}
