import { Typography } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { MessageList } from "./MessageList";

export function ChatView() {
  const { selectedConversationId } = useChatCommander();
  const conversations = useChatStore((s) => s.conversations);
  const currentConv = conversations.find((c) => c.id === selectedConversationId);

  const displayName = currentConv?.displayName || "";
  const userCount = currentConv?.chatroom ? (currentConv.chatroom as { userCount?: number }).userCount ?? 0 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {currentConv && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 48,
            borderBottom: "1px solid var(--color-border, rgba(0,0,0,0.08))",
            padding: "0 16px",
            flexShrink: 0,
          }}
        >
          <Typography variant="label" color="var(--color-text-primary)" weight={600}>
            {displayName}
          </Typography>
          {currentConv.isGroup && userCount > 0 && (
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginLeft: 8 }}>
              ({userCount}人)
            </Typography>
          )}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <MessageList />
      </div>
    </div>
  );
}
