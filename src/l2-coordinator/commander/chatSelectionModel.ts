import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";

export interface ChatSelectionState {
  mode: boolean;
  selectedMessageIds: string[];
  lastSelectedMessageId: string | null;
  status: string | null;
}

export function createEmptyChatSelectionState(): ChatSelectionState {
  return {
    mode: false,
    selectedMessageIds: [],
    lastSelectedMessageId: null,
    status: null,
  };
}

export function enterSelectionMode(state: ChatSelectionState): ChatSelectionState {
  return {
    ...state,
    mode: true,
    status: null,
  };
}

export function exitSelectionMode(_state: ChatSelectionState): ChatSelectionState {
  return createEmptyChatSelectionState();
}

export function toggleMessageSelection({
  state,
  messages,
  messageId,
  range = false,
}: {
  state: ChatSelectionState;
  messages: ChatMessage[];
  messageId: string;
  range?: boolean;
}): ChatSelectionState {
  const selected = new Set(state.selectedMessageIds);

  if (range && state.lastSelectedMessageId) {
    const ids = getRangeMessageIds(messages, state.lastSelectedMessageId, messageId);
    for (const id of ids) selected.add(id);
  } else if (selected.has(messageId)) {
    selected.delete(messageId);
  } else {
    selected.add(messageId);
  }

  return {
    mode: true,
    selectedMessageIds: orderedIds([...selected], messages),
    lastSelectedMessageId: messageId,
    status: null,
  };
}

export function selectVisibleMessages({
  state,
  visibleMessages,
}: {
  state: ChatSelectionState;
  visibleMessages: ChatMessage[];
}): ChatSelectionState {
  return {
    ...state,
    mode: true,
    selectedMessageIds: visibleMessages.map((message) => message.id),
    lastSelectedMessageId: visibleMessages.length > 0
      ? visibleMessages[visibleMessages.length - 1]?.id ?? null
      : state.lastSelectedMessageId,
    status: null,
  };
}

export function reconcileSelectionWithMessages({
  state,
  messages,
}: {
  state: ChatSelectionState;
  messages: ChatMessage[];
}): ChatSelectionState {
  const availableIds = new Set(messages.map((message) => message.id));
  const selectedMessageIds = state.selectedMessageIds.filter((id) => availableIds.has(id));
  const lastSelectedMessageId = state.lastSelectedMessageId && availableIds.has(state.lastSelectedMessageId)
    ? state.lastSelectedMessageId
    : selectedMessageIds.length > 0
      ? selectedMessageIds[selectedMessageIds.length - 1] ?? null
      : null;

  return {
    ...state,
    selectedMessageIds,
    lastSelectedMessageId,
    mode: state.mode && selectedMessageIds.length > 0,
  };
}

export function deriveSelectedMessages({
  state,
  messages,
}: {
  state: ChatSelectionState;
  messages: ChatMessage[];
}): ChatMessage[] {
  const selected = new Set(state.selectedMessageIds);
  return messages.filter((message) => selected.has(message.id));
}

export function getSelectionPrivacySummary({
  state,
  messages,
}: {
  state: ChatSelectionState;
  messages: ChatMessage[];
  privacyOn: boolean;
}): string {
  const selectedMessages = deriveSelectedMessages({ state, messages });
  if (selectedMessages.length === 0) return "未选择消息";
  const timeRange = getTimeRange(selectedMessages);
  const typeCounts = getTypeCounts(selectedMessages);
  const typeText = Object.entries(typeCounts)
    .map(([type, count]) => `${type} ${count} 条`)
    .join("，");

  return `已选 ${selectedMessages.length} 条 · ${timeRange} · ${typeText}`;
}

function getRangeMessageIds(messages: ChatMessage[], startId: string, endId: string): string[] {
  const start = messages.findIndex((message) => message.id === startId);
  const end = messages.findIndex((message) => message.id === endId);
  if (start < 0 || end < 0) return [endId];
  const [from, to] = start <= end ? [start, end] : [end, start];
  return messages.slice(from, to + 1).map((message) => message.id);
}

function orderedIds(ids: string[], messages: ChatMessage[]): string[] {
  const selected = new Set(ids);
  return messages.filter((message) => selected.has(message.id)).map((message) => message.id);
}

function getTimeRange(messages: ChatMessage[]): string {
  const first = messages[0]?.time ?? "未知时间";
  const last = messages[messages.length - 1]?.time ?? first;
  return first === last ? first : `${first} - ${last}`;
}

function getTypeCounts(messages: ChatMessage[]): Record<string, number> {
  return messages.reduce<Record<string, number>>((counts, message) => {
    const type = getSelectionTypeLabel(message.mediaType || message.type || "unknown");
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

function getSelectionTypeLabel(type: string): string {
  if (type === "text") return "文本";
  if (type === "image") return "图片";
  if (type === "video") return "视频";
  if (type === "voice") return "语音";
  if (type === "file") return "文件";
  if (type === "link") return "链接";
  if (type === "system") return "系统";
  if (type === "revoke") return "撤回";
  if (type === "red_packet") return "红包";
  if (type === "location") return "位置";
  return "其他";
}
