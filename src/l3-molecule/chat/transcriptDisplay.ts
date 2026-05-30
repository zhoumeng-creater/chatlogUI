import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export type TranscriptTone = "self" | "other" | "neutral";

export interface MessageDateGroup {
  dateLabel: string;
  messages: ChatMessage[];
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  "3": "图片",
  "4": "视频",
  "6": "文件",
  "34": "语音",
  "47": "表情",
  "49": "链接",
  image: "图片",
  video: "视频",
  file: "文件",
  voice: "语音",
  audio: "语音",
  emoji: "表情",
  link: "链接",
};

export function getTranscriptTone(message: Pick<ChatMessage, "direction">): TranscriptTone {
  if (message.direction === "self") return "self";
  if (message.direction === "other") return "other";
  return "neutral";
}

export function getMessageKindLabel(message: Pick<ChatMessage, "mediaType" | "type">): string {
  if (message.mediaType) {
    return MESSAGE_TYPE_LABELS[message.mediaType] ?? message.mediaType;
  }

  return MESSAGE_TYPE_LABELS[message.type] ?? "";
}

export function shouldShowSender(message: Pick<ChatMessage, "isGroup" | "direction">): boolean {
  return message.isGroup && message.direction !== "self";
}

export function getDateLabel(time: string): string {
  const match = time.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("zh-CN");
}

export function formatMessageClock(time: string): string {
  const parsed = new Date(time.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupMessagesByDate(messages: ChatMessage[]): MessageDateGroup[] {
  const groups: MessageDateGroup[] = [];

  for (const message of messages) {
    const dateLabel = getDateLabel(message.time) || "未知日期";
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.dateLabel === dateLabel) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ dateLabel, messages: [message] });
    }
  }

  return groups;
}
