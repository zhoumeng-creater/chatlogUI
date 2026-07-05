import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export interface MessageSelectionFilterState {
  sender: string;
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
  loadedCount: number;
}

export const DEFAULT_MESSAGE_SELECTION_FILTERS: MessageSelectionFilterState = {
  sender: "all",
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
  const senderEntries = getSenderEntries(messages);
  const selectedSender = filters.sender === "all"
    ? null
    : senderEntries[Number(filters.sender.replace("sender-", "")) - 1]?.key ?? null;

  return messages
    .filter((message) => {
      const date = getMessageDate(message);
      if (selectedSender && getSenderKey(message) !== selectedSender) return false;
      if (filters.startDate && (!date || date < filters.startDate)) return false;
      if (filters.endDate && (!date || date > filters.endDate)) return false;
      return true;
    })
    .map((message) => message.id);
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

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}
