import { StatusIndicator, Typography } from "@l4/ui";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { getConversationBadge, maskDisplayText } from "./conversationDisplay";

interface TranscriptHeaderProps {
  conversation: Conversation;
  totalCount: number;
  privacyOn: boolean;
}

export function TranscriptHeader({ conversation, totalCount, privacyOn }: TranscriptHeaderProps) {
  const displayName = privacyOn
    ? maskDisplayText(conversation.displayName)
    : conversation.displayName;
  const username = privacyOn ? maskDisplayText(conversation.username) : conversation.username;
  const countLabel = totalCount ? ` · ${totalCount.toLocaleString()} 条` : "";
  const badge = getConversationBadge(conversation);

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
      <StatusIndicator
        tone={badge.tone}
        label={`${badge.label}${countLabel}`}
      />
    </header>
  );
}
