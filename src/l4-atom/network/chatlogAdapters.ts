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

type MessageDirection = "self" | "other" | "unknown";

function normalizeBooleanFlag(value: boolean | number | undefined): boolean | null {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}

function normalizeMessageDirection(raw: RawHistoryMessage): MessageDirection {
  const explicit = String(raw.direction ?? "").trim().toLowerCase();
  if (["self", "me", "mine", "out", "outgoing", "sent", "from_me", "1"].includes(explicit)) {
    return "self";
  }
  if (["other", "them", "incoming", "received", "in", "0"].includes(explicit)) {
    return "other";
  }

  const selfFlag =
    normalizeBooleanFlag(raw.is_self) ??
    normalizeBooleanFlag(raw.from_me) ??
    normalizeBooleanFlag(raw.is_from_me);
  if (selfFlag === true) return "self";
  if (selfFlag === false) return "other";
  return "unknown";
}

function historySortValue(message: ReturnType<typeof adaptHistoryMessage>, index: number) {
  const parsedTime = message.time ? Date.parse(message.time.replace(" ", "T")) : Number.NaN;
  const timeValue = message.timestamp > 0
    ? message.timestamp
    : Number.isNaN(parsedTime)
      ? 0
      : Math.floor(parsedTime / 1000);
  return {
    timeValue,
    localId: message.localId,
    seq: message.seq,
    index,
  };
}

function sortChronological(messages: ReturnType<typeof adaptHistoryMessage>[]) {
  return messages
    .map((message, index) => ({ message, sort: historySortValue(message, index) }))
    .sort((a, b) =>
      a.sort.timeValue - b.sort.timeValue ||
      a.sort.localId - b.sort.localId ||
      a.sort.seq - b.sort.seq ||
      a.sort.index - b.sort.index,
    )
    .map((item) => item.message);
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
  const direction = normalizeMessageDirection(raw);
  const isSelf = direction === "self";

  return {
    id,
    seq: raw.seq ?? localId,
    localId,
    timestamp,
    time: raw.time ?? "",
    talker: raw.talker ?? chat,
    talkerName: raw.talker_name ?? "",
    sender: raw.sender ?? "unknown",
    senderName: raw.sender_name ?? raw.talker_name ?? raw.sender ?? "",
    isSelf,
    type: raw.type ?? "text",
    subType: raw.sub_type ?? "",
    content: raw.content ?? "",
    chat,
    username,
    isGroup,
    chatType,
    mediaType: raw.media_type,
    mediaUrl: raw.media_url,
    imageUrl: raw.image_url,
    fileName: raw.file_name,
    hour: raw.hour,
    hasMedia: raw.has_media === true || raw.has_media === 1,
    attachments: adaptMediaAttachments(raw, "history"),
    direction,
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
    querySince: raw.query_since,
    queryUntil: raw.query_until,
    queryRangeLabel: raw.query_range_label ?? "",
    messages: sortChronological((raw.messages ?? []).map((message) => adaptHistoryMessage(message, context))),
  };
}

export function adaptSearchResponse(raw: RawSearchResponse) {
  return {
    query: raw.query ?? "",
    chats: raw.chats ?? [],
    totalCount: raw.total_count,
    count: raw.count,
    limit: raw.limit,
    offset: raw.offset,
    querySince: raw.query_since,
    queryUntil: raw.query_until,
    queryRangeLabel: raw.query_range_label ?? "",
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

export type ChatType =
  | "private"
  | "group"
  | "official_account"
  | "subscription_account"
  | "service_account"
  | "enterprise_contact"
  | "enterprise_account"
  | "system"
  | "folded"
  | "unknown";

export function normalizeChatType(value: string | undefined, username: string): ChatType {
  const normalized = value?.trim().toLowerCase() ?? "";
  const normalizedUsername = username.trim().toLowerCase();
  if (normalized === "group" || normalizedUsername.endsWith("@chatroom")) return "group";
  if (["subscription", "subscription_account", "subscribe_account"].includes(normalized)) {
    return "subscription_account";
  }
  if (["service", "service_account", "mp_service"].includes(normalized)) return "service_account";
  if (["enterprise_contact", "wecom_contact", "work_contact"].includes(normalized)) {
    return "enterprise_contact";
  }
  if (
    ["enterprise", "enterprise_account", "wecom", "work_wechat"].includes(normalized) ||
    normalizedUsername.startsWith("wework_")
  ) {
    return "enterprise_account";
  }
  if (
    ["system", "system_account", "notification"].includes(normalized) ||
    ["filehelper", "newsapp", "weixin"].includes(normalizedUsername)
  ) {
    return "system";
  }
  if (
    normalized === "official" ||
    normalized === "official_account" ||
    normalizedUsername.startsWith("gh_")
  ) {
    return "official_account";
  }
  if (normalized === "folded") return "folded";
  if (["private", "friend", "contact", "single", "individual"].includes(normalized) || !normalized) {
    return "private";
  }
  return "unknown";
}

export function adaptSessionToConversation(raw: RawSession) {
  const chatType = normalizeChatType(raw.account_kind ?? raw.chat_type, raw.username);
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
  const chatType = normalizeChatType(raw.account_kind ?? raw.chat_type, raw.username);
  return {
    id: raw.username,
    username: raw.username,
    displayName: name,
    chatType,
    isGroup: chatType === "group",
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

export function mergeUnreadCounts<T extends { id: string; username: string; unread: number }>(
  conversations: T[],
  unread: { total?: number; chats: Array<{ chat: string; count: number }> },
): T[] {
  const unreadByChat = new Map(unread.chats.map((item) => [item.chat, item.count]));
  return conversations.map((conversation) => ({
    ...conversation,
    unread: unreadByChat.get(conversation.username) ?? unreadByChat.get(conversation.id) ?? 0,
  }));
}
