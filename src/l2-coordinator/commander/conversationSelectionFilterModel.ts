import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export interface MessageSelectionFilterState {
  sender: string;
  messageType: string;
  startDate: string;
  endDate: string;
}

export interface MessageSelectionSenderOption {
  value: string;
  label: string;
  count: number;
}

export interface MessageSelectionFilterModel {
  senderOptions: MessageSelectionSenderOption[];
  typeOptions: MessageSelectionSenderOption[];
  loadedCount: number;
}

export const DEFAULT_MESSAGE_SELECTION_FILTERS: MessageSelectionFilterState = {
  sender: "all",
  messageType: "all",
  startDate: "",
  endDate: "",
};

export function buildMessageSelectionFilterModel({
  messages,
  privacyOn,
}: {
  messages: ChatMessage[];
  privacyOn: boolean;
}): MessageSelectionFilterModel {
  const senders = getSenderEntries(messages);
  const types = getTypeEntries(messages);
  return {
    loadedCount: messages.length,
    senderOptions: [
      { value: "all", label: "全部对象", count: messages.length },
      ...senders.map((sender, index) => ({
        value: `sender-${index + 1}`,
        label: privacyOn ? maskDisplayText(sender.label) : sender.label,
        count: sender.count,
      })),
    ],
    typeOptions: [
      { value: "all", label: "全部类型", count: messages.length },
      ...types.map((type) => ({
        value: `type-${type.key}`,
        label: type.label,
        count: type.count,
      })),
    ],
  };
}

export function validateMessageSelectionFilter(filters: MessageSelectionFilterState): string | null {
  if (filters.startDate && !isDateOnly(filters.startDate)) return "开始日期格式无效。";
  if (filters.endDate && !isDateOnly(filters.endDate)) return "结束日期格式无效。";
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    return "开始日期不能晚于结束日期。";
  }
  return null;
}

export function selectMessageIdsByFilter({
  messages,
  filters,
}: {
  messages: ChatMessage[];
  senderOptions: MessageSelectionSenderOption[];
  filters: MessageSelectionFilterState;
}): string[] {
  return filterMessagesBySelectionFilter({ messages, filters }).map((message) => message.id);
}

export function filterMessagesBySelectionFilter({
  messages,
  filters,
}: {
  messages: ChatMessage[];
  filters: MessageSelectionFilterState;
}): ChatMessage[] {
  const senderEntries = getSenderEntries(messages);
  const selectedSender = filters.sender === "all"
    ? null
    : senderEntries[Number(filters.sender.replace("sender-", "")) - 1]?.key ?? null;
  const selectedType = filters.messageType === "all"
    ? null
    : filters.messageType.replace(/^type-/, "");

  return messages
    .filter((message) => {
      const date = getMessageDate(message);
      if (selectedSender && getSenderKey(message) !== selectedSender) return false;
      if (selectedType && getMessageTypeKey(message) !== selectedType) return false;
      if (filters.startDate && (!date || date < filters.startDate)) return false;
      if (filters.endDate && (!date || date > filters.endDate)) return false;
      return true;
    });
}

function getSenderEntries(messages: ChatMessage[]): Array<{ key: string; label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const message of messages) {
    const key = getSenderKey(message);
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { label: getSenderLabel(message), count: 1 });
    }
  }
  return [...counts.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
}

function getSenderKey(message: ChatMessage): string {
  return getSenderLabel(message).trim() || "未知对象";
}

function getSenderLabel(message: ChatMessage): string {
  return message.senderName || message.sender || message.talkerName || message.talker || "未知对象";
}

function getMessageDate(message: ChatMessage): string | null {
  const match = message.time.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function getTypeEntries(messages: ChatMessage[]): Array<{ key: string; label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const message of messages) {
    const key = getMessageTypeKey(message);
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { label: getMessageTypeLabel(key), count: 1 });
    }
  }
  return [...counts.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
}

function getMessageTypeKey(message: ChatMessage): string {
  return (message.mediaType || message.type || "unknown").trim().toLowerCase() || "unknown";
}

function getMessageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: "文本",
    image: "图片",
    video: "视频",
    voice: "语音",
    file: "文件",
    link: "链接",
    system: "系统",
    revoke: "撤回",
    red_packet: "红包",
    location: "位置",
    unknown: "未知",
  };
  return labels[type] ?? type;
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}
