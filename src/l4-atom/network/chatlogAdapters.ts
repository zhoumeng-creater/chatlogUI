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
  RawSearchCapabilities,
  RawSearchV2Hit,
  RawSearchV2Response,
} from "./chatlogRawTypes";
import { adaptMediaAttachments } from "./mediaAdapters";
import {
  SEARCH_CATEGORIES,
  type SearchCapabilities,
  type SearchCategory,
  type SearchHit,
  type SearchMatchSegment,
  type SearchSnapshotPage,
} from "@/l2-coordinator/api-docs/search";

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

export function adaptSearchCapabilities(raw: unknown): SearchCapabilities | null {
  if (!isRecord(raw)) return null;
  const value = raw as unknown as RawSearchCapabilities;
  if (
    value.contract_version !== "search.v2" ||
    typeof value.exact_total !== "boolean" ||
    typeof value.complete_scope !== "boolean" ||
    typeof value.sender_filter !== "boolean" ||
    typeof value.snapshot_cursor !== "boolean" ||
    typeof value.inclusive_time_boundaries !== "boolean" ||
    !isExactSearchTaxonomy(value.taxonomy) ||
    value.default_page_size !== 50 ||
    value.max_page_size !== 50 ||
    value.max_keyword_graphemes !== 200 ||
    value.max_keyword_terms !== 20
  ) {
    return null;
  }
  return {
    mode: "v2",
    contractVersion: "search.v2",
    exactTotal: value.exact_total,
    completeScope: value.complete_scope,
    senderFilter: value.sender_filter,
    taxonomy: [...value.taxonomy],
    snapshotCursor: value.snapshot_cursor,
    inclusiveTimeBoundaries: value.inclusive_time_boundaries,
    defaultPageSize: value.default_page_size,
    maxPageSize: value.max_page_size,
    maxKeywordGraphemes: value.max_keyword_graphemes,
    maxKeywordTerms: value.max_keyword_terms,
  };
}

export function adaptSearchV2Response(raw: unknown): SearchSnapshotPage | null {
  if (!isRecord(raw)) return null;
  const value = raw as unknown as RawSearchV2Response;
  if (
    !isNonEmptyString(value.snapshot_id) ||
    !isNonEmptyString(value.data_revision) ||
    typeof value.exact_total !== "boolean" ||
    typeof value.complete_scope !== "boolean" ||
    !isNonNegativeSafeInteger(value.total_count) ||
    !isNonNegativeSafeInteger(value.count) ||
    !isNonNegativeSafeInteger(value.window_start) ||
    typeof value.previous_cursor !== "string" ||
    typeof value.next_cursor !== "string" ||
    typeof value.has_previous !== "boolean" ||
    typeof value.has_next !== "boolean" ||
    !isOptionalSafeInteger(value.query_since) ||
    !isOptionalSafeInteger(value.query_until) ||
    !Array.isArray(value.messages)
  ) {
    return null;
  }
  if (
    value.count !== value.messages.length ||
    value.count > 50 ||
    value.window_start + value.count > value.total_count ||
    (value.has_previous && value.previous_cursor.length === 0) ||
    (!value.has_previous && value.previous_cursor.length > 0) ||
    (value.has_next && value.next_cursor.length === 0) ||
    (!value.has_next && value.next_cursor.length > 0) ||
    (value.query_since !== undefined &&
      value.query_until !== undefined &&
      value.query_since > value.query_until)
  ) {
    return null;
  }
  const messages: SearchHit[] = [];
  for (let index = 0; index < value.messages.length; index += 1) {
    const hit = adaptSearchV2Hit(value.messages[index]);
    if (!hit || hit.sourceIndex !== value.window_start + index) return null;
    messages.push(hit);
  }
  return {
    snapshotId: value.snapshot_id,
    dataRevision: value.data_revision,
    exactTotal: value.exact_total,
    completeScope: value.complete_scope,
    totalCount: value.total_count,
    count: value.count,
    windowStart: value.window_start,
    previousCursor: value.previous_cursor,
    nextCursor: value.next_cursor,
    hasPrevious: value.has_previous,
    hasNext: value.has_next,
    querySince: value.query_since,
    queryUntil: value.query_until,
    messages,
  };
}

function adaptSearchV2Hit(raw: unknown): SearchHit | null {
  if (!isRecord(raw)) return null;
  const value = raw as unknown as RawSearchV2Hit;
  if (
    !isNonEmptyString(value.message_id) ||
    !isSafeInteger(value.seq) ||
    !isNonNegativeSafeInteger(value.source_index) ||
    !isNonEmptyString(value.conversation_id) ||
    typeof value.conversation_name !== "string" ||
    typeof value.sender_id !== "string" ||
    typeof value.sender_name !== "string" ||
    !isSafeInteger(value.timestamp) ||
    !isSafeInteger(value.type) ||
    !isSafeInteger(value.sub_type) ||
    !isSearchCategory(value.category) ||
    !isNonEmptyString(value.match_field) ||
    typeof value.snippet !== "string" ||
    !Array.isArray(value.match_segments)
  ) {
    return null;
  }
  const matchSegments: SearchMatchSegment[] = [];
  let reconstructed = "";
  let hasMatch = false;
  for (const rawSegment of value.match_segments) {
    if (!isRecord(rawSegment) || typeof rawSegment.text !== "string" || typeof rawSegment.matched !== "boolean") {
      return null;
    }
    const segment = { text: rawSegment.text, matched: rawSegment.matched };
    reconstructed += segment.text;
    hasMatch ||= segment.matched && segment.text.length > 0;
    matchSegments.push(segment);
  }
  if (reconstructed !== value.snippet || !hasMatch) return null;
  return {
    messageId: value.message_id,
    seq: value.seq,
    sourceIndex: value.source_index,
    conversationId: value.conversation_id,
    conversationName: value.conversation_name,
    senderId: value.sender_id,
    senderName: value.sender_name,
    timestamp: value.timestamp,
    type: value.type,
    subType: value.sub_type,
    category: value.category,
    matchField: value.match_field,
    snippet: value.snippet,
    matchSegments,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return isSafeInteger(value) && value >= 0;
}

function isOptionalSafeInteger(value: unknown): value is number | undefined {
  return value === undefined || isSafeInteger(value);
}

function isSearchCategory(value: unknown): value is SearchCategory {
  return typeof value === "string" && (SEARCH_CATEGORIES as readonly string[]).includes(value);
}

function isExactSearchTaxonomy(value: unknown): value is SearchCategory[] {
  return (
    Array.isArray(value) &&
    value.length === SEARCH_CATEGORIES.length &&
    value.every((category, index) => category === SEARCH_CATEGORIES[index])
  );
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
