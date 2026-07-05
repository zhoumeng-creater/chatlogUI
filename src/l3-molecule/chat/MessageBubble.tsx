import { useState } from "react";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import type {
  MessageActionId,
  MessageActionModel,
  SafeRawFieldRow,
} from "@l2/commander/messageActionModel";
import { classNames } from "@/utils/classNames";
import { maskDisplayText } from "./conversationDisplay";
import { MessageActionMenu } from "./MessageActionMenu";
import { MessageRawFieldInspector } from "./MessageRawFieldInspector";
import { MessageMeta } from "./MessageMeta";
import {
  getMessageAttachmentSummary,
  getMessageKindLabel,
  getTranscriptTone,
} from "./transcriptDisplay";

interface MessageBubbleProps {
  message: ChatMessage;
  privacyOn: boolean;
  highlighted?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  actionModel?: MessageActionModel;
  safeRawFieldRows?: SafeRawFieldRow[];
  onEnterSelectionMode?: () => void;
  onToggleSelected?: (range: boolean) => void;
  onAction?: (actionId: MessageActionId) => void;
}

function getContent(message: ChatMessage): string {
  const kindLabel = getMessageKindLabel(message);
  if (message.content) return message.content;
  if (kindLabel) return `[${kindLabel}]`;
  return "";
}

export function MessageBubble({
  message,
  privacyOn,
  highlighted = false,
  selectionMode = false,
  selected = false,
  actionModel,
  safeRawFieldRows = [],
  onEnterSelectionMode,
  onToggleSelected,
  onAction,
}: MessageBubbleProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [rawInspectorOpen, setRawInspectorOpen] = useState(false);
  const tone = getTranscriptTone(message);
  const rawContent = getContent(message);
  const content = privacyOn ? maskDisplayText(rawContent) : rawContent;
  const attachmentSummary = getMessageAttachmentSummary(message, privacyOn);
  const hasLegacyMedia = Boolean(message.mediaUrl || message.imageUrl);

  if (!content && !attachmentSummary && !hasLegacyMedia) return null;

  const resolvedActionModel = actionModel ?? { actions: [] };
  const handleAction = (actionId: MessageActionId) => {
    if (actionId === "select-message") {
      onEnterSelectionMode?.();
      onToggleSelected?.(false);
      setActionsOpen(false);
      return;
    }
    if (actionId === "view-safe-raw-fields") {
      setRawInspectorOpen(true);
      setActionsOpen(false);
      return;
    }
    onAction?.(actionId);
    setActionsOpen(false);
  };

  return (
    <div className={classNames(
      "message-row",
      `message-row--${tone}`,
      highlighted && "message-row--search-hit",
      selectionMode && "message-row--selecting",
      selected && "message-row--selected",
    )}>
      {selectionMode && (
        <label className="message-row__select">
          <input
            type="checkbox"
            checked={selected}
            aria-label={selected ? "取消选择消息" : "选择消息"}
            onChange={(event) => onToggleSelected?.(event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)}
          />
        </label>
      )}
      <article
        className="message-bubble"
        aria-label={highlighted ? "搜索命中消息" : undefined}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionsOpen(true);
        }}
      >
        <MessageMeta message={message} privacyOn={privacyOn} />
        {content && <span>{content}</span>}
        {attachmentSummary && (
          <div className="message-attachments" aria-label="消息附件">
            <span className="message-attachment-card">
              {attachmentSummary}
            </span>
          </div>
        )}
        {!attachmentSummary && hasLegacyMedia && (
          <span className="message-attachment-card message-attachment-card--inline" aria-label="媒体占位">
            {privacyOn ? "[媒体]" : "[媒体可用]"}
          </span>
        )}
        <div
          className="message-bubble__actions"
        >
          <MessageActionMenu
            model={selectionMode ? resolvedActionModel : ensureSelectionAction(resolvedActionModel)}
            open={actionsOpen}
            onToggleOpen={() => setActionsOpen((value) => !value)}
            onAction={handleAction}
          />
        </div>
      </article>
      {rawInspectorOpen && (
        <MessageRawFieldInspector
          rows={safeRawFieldRows}
          onClose={() => setRawInspectorOpen(false)}
        />
      )}
    </div>
  );
}

function ensureSelectionAction(model: MessageActionModel): MessageActionModel {
  if (model.actions.some((action) => action.id === "select-message")) return model;
  return {
    actions: [
      {
        id: "select-message",
        label: "选择消息",
        enabled: true,
        disabledReason: null,
        requiresConfirmation: false,
      },
      ...model.actions,
    ],
  };
}
