import type {
  RawContact,
  RawContactsResponse,
  RawSession,
  RawSessionsResponse,
  RawChatRoom,
  RawChatRoomsResponse,
  RawHistoryMessage,
  RawHistoryResponse,
  RawSearchResponse,
  RawStatsResponse,
  RawDashboardTrendResponse,
} from "./chatlogRawTypes";
import { adaptMediaAttachments } from "./mediaAdapters";

export function displayName(
  raw: Pick<RawContact, "display" | "remark" | "nickname" | "username">,
): string {
  return raw.display || raw.remark || raw.nickname || raw.username;
}

export function adaptContact(raw: RawContact) {
  return {
    userName: raw.username,
    alias: raw.alias ?? "",
    remark: raw.remark ?? "",
    nickName: displayName(raw),
    isFriend: raw.is_friend ?? false,
  };
}

export function adaptSession(raw: RawSession) {
  return {
    userName: raw.username,
    nickName: raw.chat || raw.username,
    content: raw.summary ?? "",
    nTime: raw.timestamp ?? 0,
    isGroup: raw.is_group ?? raw.chat_type === "group",
    chatType: raw.chat_type ?? "",
  };
}

export function adaptChatRoom(raw: RawChatRoom) {
  return {
    name: raw.name,
    nickName: raw.display || raw.nickname || raw.remark || raw.name,
    owner: raw.owner ?? "",
    userCount: raw.user_count ?? 0,
  };
}

interface HistoryMessageContext {
  chat?: string;
  username?: string;
  isGroup?: boolean;
  chatType?: string;
}

export function adaptHistoryMessage(raw: RawHistoryMessage, context: HistoryMessageContext = {}) {
  const timestamp = raw.timestamp ?? 0;
  const localId = raw.local_id ?? 0;
  const username = raw.username ?? context.username ?? raw.chat ?? "";
  const chat = raw.chat ?? context.chat ?? username;
  const inferredChatType = username ? normalizeChatType(undefined, username) : "";
  const chatType = raw.chat_type ?? context.chatType ?? inferredChatType;
  const isGroup = raw.is_group ?? context.isGroup ?? chatType === "group";
  const idBase = username || chat || "unknown";
  const id = localId
    ? `${idBase}-${localId}`
    : `${idBase}-${raw.sender ?? "unknown"}-${timestamp}`;

  return {
    id,
    localId,
    timestamp,
    time: raw.time ?? "",
    sender: raw.sender ?? "unknown",
    type: raw.type ?? "text",
    content: raw.content ?? "",
    chat,
    username,
    isGroup,
    chatType,
    mediaType: raw.media_type,
    mediaUrl: raw.media_url,
    imageUrl: raw.image_url,
    attachments: adaptMediaAttachments(raw, "history"),
    direction: "unknown" as "self" | "other" | "unknown",
  };
}

export function adaptHistoryResponse(raw: RawHistoryResponse) {
  const context: HistoryMessageContext = {
    chat: raw.chat,
    username: raw.username ?? raw.chat,
    isGroup: raw.is_group ?? false,
    chatType: raw.chat_type ?? "",
  };

  return {
    chat: raw.chat,
    username: raw.username ?? raw.chat,
    isGroup: raw.is_group ?? false,
    chatType: raw.chat_type ?? "",
    totalCount: raw.total_count,
    count: raw.count,
    limit: raw.limit,
    offset: raw.offset,
    messages: (raw.messages ?? []).map((message) => adaptHistoryMessage(message, context)),
  };
}

export function adaptSearchResponse(raw: RawSearchResponse) {
  return {
    totalCount: raw.total_count,
    count: raw.count,
    limit: raw.limit,
    offset: raw.offset,
    messages: (raw.messages ?? []).map((message) => adaptHistoryMessage(message)),
  };
}

export function adaptStatsResponse(raw: RawStatsResponse) {
  return {
    chat: raw.chat,
    username: raw.username ?? raw.chat,
    isGroup: raw.is_group ?? false,
    chatType: raw.chat_type ?? "",
    total: raw.total ?? 0,
    sentCount: raw.sent_count ?? 0,
    receivedCount: raw.received_count ?? 0,
    activeSenders: raw.active_senders ?? 0,
    activeDays: raw.active_days ?? 0,
    firstMessageTime: raw.first_message_time ?? 0,
    lastMessageTime: raw.last_message_time ?? 0,
    querySince: raw.query_since,
    queryUntil: raw.query_until,
    queryRangeLabel: raw.query_range_label ?? "",
    byType: raw.by_type ?? [],
    topSenders: (raw.top_senders ?? []).map((s) => ({
      sender: s.sender,
      count: s.count,
      display: s.display ?? s.sender,
    })),
    byHour: raw.by_hour ?? [],
  };
}

export function adaptDashboardTrendResponse(raw: RawDashboardTrendResponse) {
  return {
    chat: raw.chat ?? "",
    window: raw.window ?? "",
    windowLabel: raw.window_label ?? "",
    from: raw.from ?? 0,
    to: raw.to ?? 0,
    count: raw.count ?? 0,
    truncated: raw.truncated ?? false,
    summary: raw.summary ?? "",
    summaryError: raw.summary_error,
    source: raw.source ?? "",
    daily: (raw.daily ?? []).map((d) => ({
      date: d.date ?? "",
      count: d.count ?? 0,
    })),
  };
}

export type ChatType = "private" | "group" | "official_account" | "folded" | "unknown";

export function normalizeChatType(value: string | undefined, username: string): ChatType {
  if (value === "group" || username.endsWith("@chatroom")) return "group";
  if (value === "official_account" || username.startsWith("gh_")) return "official_account";
  if (value === "folded") return "folded";
  if (value === "private" || !value) return "private";
  return "unknown";
}

export function adaptSessionToConversation(raw: RawSession) {
  const chatType = normalizeChatType(raw.chat_type, raw.username);
  return {
    id: raw.username,
    username: raw.username,
    displayName: raw.chat || raw.username,
    chatType,
    isGroup: raw.is_group ?? chatType === "group",
    summary: raw.summary ?? "",
    timestamp: raw.timestamp ?? 0,
    timeLabel: raw.time ?? "",
    unread: 0,
    lastSender: "",
    source: "session" as const,
  };
}

export function adoptContactToConversation(raw: RawContact) {
  const name = displayName(raw);
  return {
    id: raw.username,
    username: raw.username,
    displayName: name,
    chatType: "private" as ChatType,
    isGroup: false,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "contact" as const,
    contact: adaptContact(raw),
  };
}

export function adoptChatRoomToConversation(raw: RawChatRoom) {
  const name = raw.display || raw.nickname || raw.remark || raw.name;
  return {
    id: raw.name,
    username: raw.name,
    displayName: name,
    chatType: "group" as ChatType,
    isGroup: true,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "chatroom" as const,
    chatroom: adaptChatRoom(raw),
  };
}

export function mergeConversations(
  sessions: RawSessionsResponse,
  contacts: RawContactsResponse,
  chatrooms: RawChatRoomsResponse,
) {
  const conversationMap = new Map<string, ReturnType<typeof adaptSessionToConversation>>();

  const contactMap = new Map<string, ReturnType<typeof adoptContactToConversation>>();
  for (const c of contacts.contacts ?? []) {
    contactMap.set(c.username, adoptContactToConversation(c));
  }

  const chatroomMap = new Map<string, ReturnType<typeof adoptChatRoomToConversation>>();
  for (const r of chatrooms.chatrooms ?? []) {
    chatroomMap.set(r.name, adoptChatRoomToConversation(r));
  }

  for (const s of sessions.sessions ?? []) {
    const conv = adaptSessionToConversation(s);
    const existing = conversationMap.get(conv.id);
    if (!existing || existing.timestamp < conv.timestamp) {
      conversationMap.set(conv.id, conv);
    }
  }

  for (const [, conv] of conversationMap) {
    const contact = contactMap.get(conv.id);
    if (contact && !(conv as Record<string, unknown>).contact) {
      (conv as Record<string, unknown>).contact = contact.contact;
      if (conv.displayName === conv.id) {
        conv.displayName = contact.displayName;
      }
    }
    const chatroom = chatroomMap.get(conv.id);
    if (chatroom && !(conv as Record<string, unknown>).chatroom) {
      (conv as Record<string, unknown>).chatroom = chatroom.chatroom;
      if (conv.displayName === conv.id) {
        conv.displayName = chatroom.displayName;
      }
    }
  }

  return Array.from(conversationMap.values()).sort((a, b) => b.timestamp - a.timestamp);
}
