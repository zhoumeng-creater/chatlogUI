import { Typography } from "@l4/ui";
import { useChatCommander } from "@l2/commander/";
import { MessageList } from "./MessageList";

export function ChatView() {
  const { selectedContact, selectedChatRoom } = useChatCommander();

  const displayName =
    selectedChatRoom
      ? selectedChatRoom.remark || selectedChatRoom.nickName || selectedChatRoom.name
      : selectedContact
        ? selectedContact.remark || selectedContact.nickName || selectedContact.userName
        : "";

  const memberCount = selectedChatRoom?.users?.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {(selectedContact || selectedChatRoom) && (
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
          {selectedChatRoom && memberCount > 0 && (
            <Typography variant="caption" color="var(--color-text-tertiary)" style={{ marginLeft: 8 }}>
              ({memberCount}人)
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
