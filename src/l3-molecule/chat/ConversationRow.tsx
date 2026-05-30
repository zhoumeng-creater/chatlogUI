import { Avatar, StatusIndicator } from "@l4/ui";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  formatConversationA11yLabel,
  getConversationBadge,
  maskDisplayText,
} from "./conversationDisplay";

interface ConversationRowProps {
  conversation: Conversation;
  selected: boolean;
  onOpen: (conversation: Conversation) => void;
}

export function ConversationRow({ conversation, selected, onOpen }: ConversationRowProps) {
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const badge = getConversationBadge(conversation);
  const displayName = privacyOn
    ? maskDisplayText(conversation.displayName)
    : conversation.displayName;
  const summary = privacyOn ? maskDisplayText(conversation.summary) : conversation.summary;
  const fallback = displayName.slice(0, conversation.isGroup ? 1 : 2);
  const accessibilityLabel = formatConversationA11yLabel(conversation, privacyOn);
  const avatarAlt = privacyOn ? "已隐藏会话头像" : conversation.displayName;

  return (
    <button
      type="button"
      className={`conversation-row${selected ? " conversation-row--selected" : ""}`}
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
        {conversation.unread > 0 && (
          <span className="conversation-row__unread">
            {conversation.unread.toLocaleString()} 条未读
          </span>
        )}
      </span>
    </button>
  );
}
