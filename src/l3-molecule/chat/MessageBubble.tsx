import { useState, type ReactNode } from "react";
import { FileText, Image as ImageIcon, Smile, Video, Volume2, X } from "lucide-react";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import type {
  MessageActionId,
  MessageActionModel,
  SafeRawFieldRow,
} from "@l2/commander/messageActionModel";
import type { MessageAttachmentPreviewModel } from "@l2/commander/messageAttachmentPreviewModel";
import { Button, SpringModal, Typography } from "@l4/ui";
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
  getAttachmentPreviewModel?: (attachment: MediaAttachment) => MessageAttachmentPreviewModel;
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
  getAttachmentPreviewModel,
  onEnterSelectionMode,
  onToggleSelected,
  onAction,
}: MessageBubbleProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [rawInspectorOpen, setRawInspectorOpen] = useState(false);
  const [previewModel, setPreviewModel] = useState<MessageAttachmentPreviewModel | null>(null);
  const tone = getTranscriptTone(message);
  const rawContent = getContent(message);
  const content = privacyOn ? maskDisplayText(rawContent) : rawContent;
  const attachmentSummary = getMessageAttachmentSummary(message, privacyOn);
  const attachmentModels = getAttachmentPreviewModel
    ? getUniqueMessageAttachments(message.attachments ?? []).map(getAttachmentPreviewModel)
    : [];
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
        className={classNames(
          "message-bubble",
          attachmentModels.length > 0 && "message-bubble--with-attachments",
        )}
        aria-label={highlighted ? "搜索命中消息" : undefined}
        onContextMenu={(event) => {
          event.preventDefault();
          setActionsOpen(true);
        }}
      >
        <MessageMeta message={message} privacyOn={privacyOn} />
        {content && <span>{content}</span>}
        {attachmentModels.length > 0 ? (
          <div className="message-attachments" aria-label="消息附件">
            {attachmentModels.map((model) => (
              <button
                key={model.id}
                type="button"
                className="message-attachment-card message-attachment-card--button"
                aria-label={model.canPreview ? `打开${model.kindLabel}附件` : `查看${model.kindLabel}附件状态`}
                onClick={() => setPreviewModel(model)}
              >
                {getAttachmentIcon(model.kind)}
                <span>{model.label}</span>
              </button>
            ))}
          </div>
        ) : attachmentSummary ? (
          <div className="message-attachments" aria-label="消息附件">
            <span className="message-attachment-card">{attachmentSummary}</span>
          </div>
        ) : null}
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
      {previewModel && (
        <MessageAttachmentPreviewDialog
          model={previewModel}
          onClose={() => setPreviewModel(null)}
        />
      )}
    </div>
  );
}

function getAttachmentIcon(kind: MediaAttachment["kind"]): ReactNode {
  if (kind === "image") return <ImageIcon size={14} aria-hidden="true" />;
  if (kind === "sticker") return <Smile size={14} aria-hidden="true" />;
  if (kind === "video") return <Video size={14} aria-hidden="true" />;
  if (kind === "voice") return <Volume2 size={14} aria-hidden="true" />;
  return <FileText size={14} aria-hidden="true" />;
}

function getUniqueMessageAttachments(attachments: MediaAttachment[]): MediaAttachment[] {
  const seen = new Set<string>();
  return attachments.filter((attachment) => {
    const key = getAttachmentIdentity(attachment);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getAttachmentIdentity(attachment: MediaAttachment): string {
  const resource = getAttachmentResourceIdentity(attachment);
  if (resource) return `${attachment.kind}:${resource}`;

  const messageAnchor = attachment.messageId ?? attachment.localId ?? attachment.timestamp;
  if (messageAnchor !== undefined && messageAnchor !== null) {
    return [
      attachment.source,
      attachment.kind,
      String(messageAnchor),
      attachment.label,
      attachment.fileName ?? "",
    ].join(":");
  }

  return `${attachment.kind}:${attachment.id}`;
}

function getAttachmentResourceIdentity(attachment: MediaAttachment): string {
  const resourceKey = attachment.resourceKey?.trim();
  if (resourceKey) return `${attachment.resourceKind}:${resourceKey}`;

  const directUrl = attachment.directUrl?.trim();
  if (!directUrl) return "";
  try {
    const url = new URL(directUrl);
    return `url:${url.origin}${url.pathname}`;
  } catch {
    return `url:${directUrl}`;
  }
}

function MessageAttachmentPreviewDialog({
  model,
  onClose,
}: {
  model: MessageAttachmentPreviewModel;
  onClose: () => void;
}) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const titleId = `message-attachment-preview-${model.id}`;
  return (
    <SpringModal titleId={titleId} ariaLabel={`${model.kindLabel}预览`} onClose={onClose}>
      <div className="chat-media-preview">
        <div className="chat-media-preview__header">
          <div className="chat-media-preview__title">
            <Typography id={titleId} variant="label" weight={800}>
              {model.kindLabel}预览
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {model.label}
            </Typography>
          </div>
          <Button variant="ghost" size="sm" aria-label="关闭附件预览" onClick={onClose}>
            <X size={15} aria-hidden="true" />
          </Button>
        </div>
        <div className="chat-media-preview__body">
          {renderPreviewBody(model, mediaFailed, () => setMediaFailed(true))}
        </div>
        <div className="chat-media-preview__meta" aria-label="附件预览状态">
          <span>{model.kindLabel}</span>
          <span>{model.canPreview ? "内嵌预览" : "仅显示状态"}</span>
        </div>
      </div>
    </SpringModal>
  );
}

function renderPreviewBody(
  model: MessageAttachmentPreviewModel,
  mediaFailed: boolean,
  onMediaError: () => void,
) {
  if (!model.canPreview || !model.resourceUrl || mediaFailed) {
    return (
      <div className="chat-media-preview__fallback" role={mediaFailed ? "alert" : "status"}>
        <Typography variant="label" weight={800}>
          {mediaFailed ? "媒体加载失败" : "当前附件不可预览"}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {mediaFailed
            ? "该资源可能尚未解密、已被移动，或当前格式不受系统播放器支持。"
            : model.disabledReason ?? "当前附件没有可预览资源。"}
        </Typography>
      </div>
    );
  }
  if (model.kind === "image" || model.kind === "sticker") {
    return (
      <div className="chat-media-preview__stage" data-kind={model.kind}>
        <img
          className="chat-media-preview__image"
          src={model.resourceUrl}
          alt={`${model.kindLabel}预览`}
          onError={onMediaError}
        />
      </div>
    );
  }
  if (model.kind === "video") {
    return (
      <div className="chat-media-preview__stage" data-kind="video">
        <video
          className="chat-media-preview__media"
          src={model.resourceUrl}
          controls
          preload="metadata"
          onError={onMediaError}
        />
      </div>
    );
  }
  if (model.kind === "voice") {
    return (
      <div className="chat-media-preview__stage" data-kind="voice">
        <audio
          className="chat-media-preview__audio"
          src={model.resourceUrl}
          controls
          preload="metadata"
          onError={onMediaError}
        />
      </div>
    );
  }
  return (
    <div className="chat-media-preview__fallback">
      <Typography variant="body" color="var(--text-secondary)">
        {model.disabledReason ?? "此类附件暂不支持内嵌预览。"}
      </Typography>
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
