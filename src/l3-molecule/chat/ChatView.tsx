import { useEffect, useState } from "react";
import { useChatCommander, useChatExtensionsCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { ConversationInspector } from "./ConversationInspector";
import { MessageList } from "./MessageList";
import { TranscriptHeader } from "./TranscriptHeader";

export function ChatView() {
  const { selectedConversationId, messagesTotalCount } = useChatCommander();
  const chatExtensions = useChatExtensionsCommander();
  const conversations = useChatStore((state) => state.conversations);
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const [membersOpen, setMembersOpen] = useState(false);
  const currentConv = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const currentMembers = currentConv
    ? chatExtensions.membersByChat[currentConv.username]
    : undefined;

  useEffect(() => {
    setMembersOpen(false);
  }, [selectedConversationId]);

  const toggleMembers = () => {
    if (!currentConv) return;
    const nextOpen = !membersOpen;
    setMembersOpen(nextOpen);
    if (nextOpen && currentConv.isGroup) {
      void chatExtensions.loadMembers(currentConv.username);
    }
  };

  return (
    <div className="transcript">
      {currentConv && (
        <TranscriptHeader
          conversation={currentConv}
          totalCount={messagesTotalCount}
          membersOpen={membersOpen}
          newMessagesStatus={chatExtensions.newMessagesStatus}
          newMessagesCount={chatExtensions.newMessagesCount}
          onToggleMembers={toggleMembers}
          onRefreshNewMessages={() => void chatExtensions.refreshNewMessages()}
        />
      )}
      {currentConv && membersOpen && (
        <ConversationInspector
          conversation={currentConv}
          members={currentMembers}
          status={chatExtensions.membersStatus}
          error={chatExtensions.membersError}
          privacyOn={privacyOn}
          onRefresh={() => void chatExtensions.loadMembers(currentConv.username)}
        />
      )}
      <MessageList />
    </div>
  );
}
