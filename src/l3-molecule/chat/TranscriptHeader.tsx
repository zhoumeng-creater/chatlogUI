import { Button, StatusIndicator, Typography } from "@l4/ui";
import type { Conversation, LoadStatus } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "./conversationDisplay";
import { formatNewMessagesStatus } from "./chatExtensionsDisplay";

interface TranscriptHeaderProps {
  conversation: Conversation;
  totalCount: number;
  membersOpen?: boolean;
  newMessagesStatus?: LoadStatus;
  newMessagesCount?: number;
  onToggleMembers?: () => void;
  onRefreshNewMessages?: () => void;
}

export function TranscriptHeader({
  conversation,
  totalCount,
  membersOpen = false,
  newMessagesStatus = "idle",
  newMessagesCount = 0,
  onToggleMembers,
  onRefreshNewMessages,
}: TranscriptHeaderProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const displayName = privacyOn
    ? maskDisplayText(conversation.displayName)
    : conversation.displayName;
  const username = privacyOn ? maskDisplayText(conversation.username) : conversation.username;
  const countLabel = totalCount ? ` · ${totalCount.toLocaleString()} 条` : "";

  return (
    <header className="transcript-header">
      <div className="transcript-header__identity">
        <Typography variant="label" weight={700} className="transcript-header__title">
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          color="var(--text-secondary)"
          className="transcript-header__meta"
        >
          {username}
        </Typography>
      </div>
      <div className="transcript-header__actions">
        <StatusIndicator
          tone={conversation.isGroup ? "success" : "neutral"}
          label={`${conversation.isGroup ? "群聊" : "私聊"}${countLabel}`}
        />
        {conversation.isGroup && onToggleMembers && (
          <Button
            variant={membersOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleMembers}
          >
            成员
          </Button>
        )}
        {onRefreshNewMessages && (
          <Button
            variant="ghost"
            size="sm"
            loading={newMessagesStatus === "loading"}
            title={formatNewMessagesStatus(newMessagesStatus, newMessagesCount)}
            onClick={onRefreshNewMessages}
          >
            新消息
          </Button>
        )}
      </div>
    </header>
  );
}
