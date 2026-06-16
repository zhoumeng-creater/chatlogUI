import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export type MessageActionId =
  | "copy-message"
  | "copy-time"
  | "copy-sender"
  | "copy-markdown-quote"
  | "jump-to-time"
  | "find-similar"
  | "view-safe-raw-fields"
  | "copy-unmasked-message";

export interface MessageActionItem {
  id: MessageActionId;
  label: string;
  enabled: boolean;
  disabledReason: string | null;
  requiresConfirmation: boolean;
}

export interface MessageActionModel {
  actions: MessageActionItem[];
}

export interface MessageActionSerialization {
  ok: boolean;
  text: string;
  privacySafe: boolean;
  disabledReason?: string;
}

export interface SafeRawFieldRow {
  label: string;
  value: string;
}

function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}

function getMessageContent(message: ChatMessage): string {
  return message.content || "";
}

function getMessageSender(message: ChatMessage): string {
  return message.senderName || message.sender || message.talkerName || message.talker || "";
}

function getCopyText(value: string, privacyOn: boolean, unmaskedConfirmed: boolean): string {
  if (!privacyOn || unmaskedConfirmed) return value;
  return maskDisplayText(value);
}

export function buildMessageActionModel({
  message,
  privacyOn,
  similarSearchSupported = false,
  unmaskedConfirmed = false,
}: {
  message: ChatMessage;
  privacyOn: boolean;
  similarSearchSupported?: boolean;
  unmaskedConfirmed?: boolean;
}): MessageActionModel {
  const hasContent = Boolean(getMessageContent(message).trim());
  const hasTime = Boolean(message.time || message.timestamp);
  const hasSender = Boolean(getMessageSender(message).trim());

  return {
    actions: [
      {
        id: "copy-message",
        label: privacyOn ? "复制脱敏消息" : "复制消息",
        enabled: hasContent,
        disabledReason: hasContent ? null : "空消息不能复制正文。",
        requiresConfirmation: false,
      },
      {
        id: "copy-time",
        label: "复制时间",
        enabled: hasTime,
        disabledReason: hasTime ? null : "这条消息没有可复制的时间。",
        requiresConfirmation: false,
      },
      {
        id: "copy-sender",
        label: privacyOn ? "复制脱敏发送者" : "复制发送者",
        enabled: hasSender,
        disabledReason: hasSender ? null : "这条消息没有发送者信息。",
        requiresConfirmation: false,
      },
      {
        id: "copy-markdown-quote",
        label: privacyOn ? "复制脱敏引用" : "复制为 Markdown 引用",
        enabled: hasContent,
        disabledReason: hasContent ? null : "空消息不能复制引用。",
        requiresConfirmation: false,
      },
      {
        id: "jump-to-time",
        label: "跳转到时间",
        enabled: hasTime,
        disabledReason: hasTime ? null : "没有时间戳，无法跳转。",
        requiresConfirmation: false,
      },
      {
        id: "find-similar",
        label: "查找同类消息",
        enabled: similarSearchSupported,
        disabledReason: similarSearchSupported ? null : "当前后端暂不支持同类消息搜索。",
        requiresConfirmation: false,
      },
      {
        id: "view-safe-raw-fields",
        label: "查看安全原始字段",
        enabled: true,
        disabledReason: null,
        requiresConfirmation: false,
      },
      {
        id: "copy-unmasked-message",
        label: "复制未脱敏消息",
        enabled: !privacyOn || unmaskedConfirmed,
        disabledReason: privacyOn && !unmaskedConfirmed
          ? "隐私模式下需要确认后才能复制未脱敏内容。"
          : null,
        requiresConfirmation: privacyOn,
      },
    ],
  };
}

export function serializeMessageAction({
  actionId,
  message,
  privacyOn,
  unmaskedConfirmed,
}: {
  actionId: MessageActionId;
  message: ChatMessage;
  privacyOn: boolean;
  unmaskedConfirmed: boolean;
}): MessageActionSerialization {
  const content = getMessageContent(message);
  const sender = getMessageSender(message);
  const time = message.time || (message.timestamp ? String(message.timestamp) : "");
  const shouldMask = privacyOn && !(actionId === "copy-unmasked-message" && unmaskedConfirmed);

  if (actionId === "copy-message" || actionId === "copy-unmasked-message") {
    if (!content.trim()) return disabledResult("空消息不能复制正文。");
    return {
      ok: true,
      text: getCopyText(content, shouldMask, false),
      privacySafe: shouldMask,
    };
  }

  if (actionId === "copy-time") {
    if (!time) return disabledResult("这条消息没有可复制的时间。");
    return { ok: true, text: time, privacySafe: true };
  }

  if (actionId === "copy-sender") {
    if (!sender.trim()) return disabledResult("这条消息没有发送者信息。");
    return {
      ok: true,
      text: getCopyText(sender, shouldMask, false),
      privacySafe: shouldMask,
    };
  }

  if (actionId === "copy-markdown-quote") {
    if (!content.trim()) return disabledResult("空消息不能复制引用。");
    const safeSender = getCopyText(sender || "未知发送者", shouldMask, false);
    const safeContent = getCopyText(content, shouldMask, false);
    const safeTime = time || "未知时间";
    return {
      ok: true,
      text: [`> ${safeContent}`, "", `- ${safeSender} · ${safeTime}`].join("\n"),
      privacySafe: shouldMask,
    };
  }

  return disabledResult("当前操作不产生可复制文本。");
}

export function getSafeRawFieldRows(message: ChatMessage): SafeRawFieldRow[] {
  return [
    { label: "本地 ID", value: String(message.localId) },
    { label: "时间", value: message.time || String(message.timestamp || "") },
    { label: "类型", value: message.type || "unknown" },
    { label: "子类型", value: message.subType || "none" },
    { label: "方向", value: message.direction || "unknown" },
    { label: "媒体类型", value: message.mediaType || (message.hasMedia ? "media" : "none") },
    { label: "附件数量", value: String(message.attachments?.length ?? 0) },
    { label: "来源类型", value: message.chatType || "unknown" },
  ];
}

function disabledResult(disabledReason: string): MessageActionSerialization {
  return {
    ok: false,
    text: "",
    privacySafe: true,
    disabledReason,
  };
}
