import { useRef } from "react";
import { Button, Spinner, Typography } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { MessageGroup } from "./MessageGroup";
import { groupMessagesByDate } from "./transcriptDisplay";

export function MessageList() {
  const {
    selectedConversationId,
    messages,
    messagesLoading,
    messagesHasMore,
    messagesStatus,
    messagesError,
    loadHistory,
    loadMoreHistory,
  } = useChatCommander();

  const conversations = useChatStore((state) => state.conversations);
  const currentConv = conversations.find((conversation) => conversation.id === selectedConversationId);
  const activeChat = currentConv?.username || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const groups = groupMessagesByDate(messages);

  if (!currentConv) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          选择会话
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          从左侧会话列表打开聊天记录。
        </Typography>
      </div>
    );
  }

  if (messagesStatus === "error") {
    return (
      <div className="workbench-error-state" role="alert">
        <Typography variant="label" weight={700}>
          聊天记录加载失败
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {messagesError ?? "无法读取该会话的历史消息。"}
        </Typography>
        <Button variant="secondary" size="sm" onClick={() => void loadHistory(activeChat)}>
          重试
        </Button>
      </div>
    );
  }

  if (messagesStatus === "empty") {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          没有消息
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          后端没有返回该会话的聊天记录。
        </Typography>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="message-list">
      {messagesHasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <Button
            variant="secondary"
            size="sm"
            loading={messagesLoading}
            onClick={() => activeChat && void loadMoreHistory(activeChat)}
          >
            加载更早消息
          </Button>
        </div>
      )}

      {messagesLoading && messages.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Spinner size={24} label="加载聊天记录..." />
        </div>
      )}

      {groups.map((group) => (
        <MessageGroup
          key={group.dateLabel}
          dateLabel={group.dateLabel}
          messages={group.messages}
        />
      ))}

      {!messagesHasMore && messages.length > 0 && (
        <div className="message-date-divider">
          已加载全部 {messages.length.toLocaleString()} 条消息
        </div>
      )}
    </div>
  );
}
