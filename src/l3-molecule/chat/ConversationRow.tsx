import { Avatar, StatusIndicator } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import type { Conversation, UnreadStatus } from "@l2/data-clerk/stores/useChatStore";
import {
  formatConversationA11yLabel,
  getConversationBadge,
  maskDisplayText,
  shouldShowUnreadBadge,
} from "./conversationDisplay";

interface ConversationRowProps {
  conversation: Conversation;
  selected: boolean;
  privacyOn: boolean;
  unreadStatus: UnreadStatus;
  onOpen: (conversation: Conversation) => void;
}

export function ConversationRow({
  conversation,
  selected,
  privacyOn,
  unreadStatus,
  onOpen,
}: ConversationRowProps) {
  const badge = getConversationBadge(conversation);
  const displayName = privacyOn
    ? maskDisplayText(conversation.displayName)
    : conversation.displayName;
  const summary = privacyOn ? maskDisplayText(conversation.summary) : conversation.summary;
  const fallback = displayName.slice(0, conversation.isGroup ? 1 : 2);
  const accessibilityLabel = formatConversationA11yLabel(conversation, privacyOn, unreadStatus);
  const avatarAlt = privacyOn ? "已隐藏会话头像" : conversation.displayName;
  const showUnread = shouldShowUnreadBadge(conversation, unreadStatus);

  return (
    <button
      type="button"
      className={classNames("conversation-row", selected && "conversation-row--selected")}
      aria-current={selected ? "true" : undefined}
      aria-label={accessibilityLabel}
      onClick={() => onOpen(conversation)}
    >
      <div
        className="conversation-row__avatar"
        style={{ filter: privacyOn ? "blur(7px)" : "none" }}
      >
        <Avatar alt={avatarAlt} size={36} fallback={fallback} />
      </div>
      <span className="conversation-row__main">
        <span className="conversation-row__top">
          <span className="conversation-row__name">{displayName}</span>
          <span className="conversation-row__time">{conversation.timeLabel}</span>
        </span>
        <span className="conversation-row__bottom">
          <span className="conversation-row__summary">{summary || "没有消息摘要"}</span>
          <StatusIndicator label={badge.label} tone={badge.tone} />
        </span>
        {showUnread && (
          <span className="conversation-row__unread">
            {conversation.unread.toLocaleString()} 条未读
          </span>
        )}
      </span>
    </button>
  );
}
