import { describe, expect, it } from "vitest";
import {
  displayName,
  adaptContact,
  adaptSession,
  adaptChatRoom,
  adaptHistoryMessage,
  adaptHistoryResponse,
  adaptSearchResponse,
  adaptStatsResponse,
  adaptDashboardTrendResponse,
  normalizeChatType,
  mergeConversations,
  adaptSessionToConversation,
  adoptContactToConversation,
  adoptChatRoomToConversation,
} from "./chatlogAdapters";
import type {
  RawContact,
  RawSession,
  RawChatRoom,
  RawHistoryMessage,
  RawHistoryResponse,
  RawSearchResponse,
  RawStatsResponse,
  RawDashboardTrendResponse,
  RawContactsResponse,
  RawSessionsResponse,
  RawChatRoomsResponse,
} from "./chatlogRawTypes";

describe("displayName", () => {
  it("returns display when available", () => {
    expect(
      displayName({
        display: "Alice",
        remark: "A",
        nickname: "alice123",
        username: "wxid_alice",
      }),
    ).toBe("Alice");
  });

  it("falls back to remark when display is empty", () => {
    expect(
      displayName({
        display: "",
        remark: "Best Friend",
        nickname: "alice123",
        username: "wxid_alice",
      }),
    ).toBe("Best Friend");
  });

  it("falls back to nickname when display and remark are empty", () => {
    expect(
      displayName({
        display: "",
        remark: "",
        nickname: "coolnick",
        username: "wxid_alice",
      }),
    ).toBe("coolnick");
  });

  it("falls back to username as last resort", () => {
    expect(
      displayName({
        display: "",
        remark: "",
        nickname: "",
        username: "wxid_alice",
      }),
    ).toBe("wxid_alice");
  });
});

describe("adaptContact", () => {
  const raw: RawContact = {
    username: "wxid_bob",
    alias: "bob",
    remark: "Brother",
    nickname: "Bob",
    display: "Bob The Builder",
    is_friend: true,
  };

  it("maps snake_case raw contact to camelCase UI model", () => {
    const result = adaptContact(raw);

    expect(result.userName).toBe("wxid_bob");
    expect(result.alias).toBe("bob");
    expect(result.remark).toBe("Brother");
    expect(result.nickName).toBe("Bob The Builder");
    expect(result.isFriend).toBe(true);
  });

  it("defaults missing optional fields", () => {
    const minimal: RawContact = { username: "wxid_min" };

    const result = adaptContact(minimal);

    expect(result.alias).toBe("");
    expect(result.remark).toBe("");
    expect(result.isFriend).toBe(false);
    expect(result.nickName).toBe("wxid_min");
  });
});

describe("adaptSession", () => {
  const raw: RawSession = {
    username: "wxid_chat",
    chat: "Alice Chat",
    is_group: false,
    chat_type: "friend",
    summary: "Last message preview",
    timestamp: 1717000000,
  };

  it("maps snake_case raw session to camelCase UI model", () => {
    const result = adaptSession(raw);

    expect(result.userName).toBe("wxid_chat");
    expect(result.nickName).toBe("Alice Chat");
    expect(result.content).toBe("Last message preview");
    expect(result.nTime).toBe(1717000000);
    expect(result.isGroup).toBe(false);
    expect(result.chatType).toBe("friend");
  });

  it("falls back to username when chat is missing", () => {
    const result = adaptSession({
      username: "wxid_only",
      chat: "",
      is_group: true,
      chat_type: "group",
      summary: "",
      timestamp: 0,
    });

    expect(result.nickName).toBe("wxid_only");
  });

  it("detects group from chat_type when is_group is undefined", () => {
    const result = adaptSession({
      username: "group_id",
      chat: "Group Chat",
      chat_type: "group",
      summary: "",
      timestamp: 0,
    });

    expect(result.isGroup).toBe(true);
  });
});

// ── adaptChatRoom ──────────────────────────────────────────────

describe("adaptChatRoom", () => {
  const full: RawChatRoom = {
    name: "room123@chatroom",
    remark: "Work Group",
    nickname: "Work",
    display: "Work Chat",
    owner: "wxid_owner",
    user_count: 42,
  };

  it("maps snake_case raw chatroom to camelCase UI model with full data", () => {
    const result = adaptChatRoom(full);

    expect(result.name).toBe("room123@chatroom");
    expect(result.nickName).toBe("Work Chat");
    expect(result.owner).toBe("wxid_owner");
    expect(result.userCount).toBe(42);
  });

  it("falls back nickName through display→nickname→remark→name chain", () => {
    expect(adaptChatRoom({ name: "r", nickname: "nick", remark: "rem" }).nickName).toBe("nick");
    expect(adaptChatRoom({ name: "r", remark: "rem" }).nickName).toBe("rem");
    expect(adaptChatRoom({ name: "r" }).nickName).toBe("r");
  });

  it("defaults missing optional fields", () => {
    const minimal: RawChatRoom = { name: "minimal_room" };

    const result = adaptChatRoom(minimal);

    expect(result.name).toBe("minimal_room");
    expect(result.nickName).toBe("minimal_room");
    expect(result.owner).toBe("");
    expect(result.userCount).toBe(0);
  });
});

// ── adaptHistoryMessage ────────────────────────────────────────

describe("adaptHistoryMessage", () => {
  const fullMsg: RawHistoryMessage = {
    timestamp: 1717000000,
    time: "2024-05-29 12:00:00",
    sender: "wxid_sender",
    type: "image",
    content: "Hello world",
    local_id: 12345,
    chat: "wxid_receiver",
    username: "wxid_receiver",
    is_group: false,
    chat_type: "private",
    media_type: "image",
    media_url: "https://example.com/img.jpg",
  };

  it("maps a full message with all fields", () => {
    const result = adaptHistoryMessage(fullMsg);

    expect(result.id).toBe("wxid_receiver-12345");
    expect(result.localId).toBe(12345);
    expect(result.timestamp).toBe(1717000000);
    expect(result.time).toBe("2024-05-29 12:00:00");
    expect(result.sender).toBe("wxid_sender");
    expect(result.type).toBe("image");
    expect(result.content).toBe("Hello world");
    expect(result.chat).toBe("wxid_receiver");
    expect(result.chatType).toBe("private");
    expect(result.mediaType).toBe("image");
    expect(result.mediaUrl).toBe("https://example.com/img.jpg");
    expect(result.direction).toBe("unknown");
  });

  it("generates id from local_id when present", () => {
    const result = adaptHistoryMessage({
      chat: "wxid_chat",
      local_id: 42,
    });
    expect(result.id).toBe("wxid_chat-42");
    expect(result.localId).toBe(42);
  });

  it("generates id from chat+sender+timestamp when no local_id", () => {
    const result = adaptHistoryMessage({
      chat: "wxid_chat",
      sender: "wxid_sender",
      timestamp: 1717000000,
    });
    expect(result.id).toBe("wxid_chat-wxid_sender-1717000000");
    expect(result.localId).toBe(0);
  });

  it("detects group message from is_group flag", () => {
    const result = adaptHistoryMessage({
      is_group: true,
      chat: "group@chatroom",
    });
    expect(result.isGroup).toBe(true);
  });

  it("detects group from chat_type fallback", () => {
    const result = adaptHistoryMessage({
      chat_type: "group",
      chat: "group@chatroom",
    });
    expect(result.isGroup).toBe(true);
  });

  it("produces stable id for same input", () => {
    const input: RawHistoryMessage = { chat: "a", sender: "b", timestamp: 1 };
    const id1 = adaptHistoryMessage(input).id;
    const id2 = adaptHistoryMessage({ ...input }).id;
    expect(id1).toBe(id2);
  });

  it("defaults missing fields gracefully", () => {
    const result = adaptHistoryMessage({});

    expect(result.id).toBe("unknown-unknown-0");
    expect(result.localId).toBe(0);
    expect(result.timestamp).toBe(0);
    expect(result.time).toBe("");
    expect(result.sender).toBe("unknown");
    expect(result.type).toBe("text");
    expect(result.content).toBe("");
    expect(result.chat).toBe("");
    expect(result.isGroup).toBe(false);
    expect(result.chatType).toBe("");
    expect(result.mediaType).toBeUndefined();
    expect(result.mediaUrl).toBeUndefined();
    expect(result.direction).toBe("unknown");
  });
});

// ── adaptHistoryResponse ───────────────────────────────────────

describe("adaptHistoryResponse", () => {
  const raw: RawHistoryResponse = {
    chat: "wxid_chat",
    username: "wxid_chat",
    is_group: false,
    chat_type: "private",
    total_count: 100,
    count: 10,
    limit: 10,
    offset: 0,
    messages: [
      { chat: "wxid_chat", timestamp: 1, content: "msg1" },
      { chat: "wxid_chat", timestamp: 2, content: "msg2" },
    ],
  };

  it("maps pagination metadata correctly", () => {
    const result = adaptHistoryResponse(raw);

    expect(result.chat).toBe("wxid_chat");
    expect(result.username).toBe("wxid_chat");
    expect(result.isGroup).toBe(false);
    expect(result.chatType).toBe("private");
    expect(result.totalCount).toBe(100);
    expect(result.count).toBe(10);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it("maps messages through adaptHistoryMessage", () => {
    const result = adaptHistoryResponse(raw);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe("msg1");
    expect(result.messages[1].content).toBe("msg2");
  });

  it("handles empty messages array", () => {
    const result = adaptHistoryResponse({
      chat: "empty",
      total_count: 0,
      count: 0,
      limit: 10,
      offset: 0,
      messages: [],
    });

    expect(result.messages).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it("defaults username to chat when missing", () => {
    const result = adaptHistoryResponse({
      chat: "wxid_only",
      total_count: 0,
      count: 0,
      limit: 10,
      offset: 0,
      messages: [],
    });
    expect(result.username).toBe("wxid_only");
  });

  it("propagates response chat metadata to history messages", () => {
    const result = adaptHistoryResponse({
      chat: "Work Group",
      username: "room123@chatroom",
      is_group: true,
      chat_type: "group",
      total_count: 1,
      count: 1,
      limit: 50,
      offset: 0,
      messages: [
        {
          timestamp: 1710000000,
          time: "2024-03-10 12:00",
          sender: "Alice",
          type: "text",
          content: "hello",
          local_id: 100,
        },
      ],
    });

    expect(result.messages[0]).toMatchObject({
      chat: "Work Group",
      username: "room123@chatroom",
      isGroup: true,
      chatType: "group",
    });
  });
});

// ── adaptSearchResponse ────────────────────────────────────────

describe("adaptSearchResponse", () => {
  const raw: RawSearchResponse = {
    total_count: 50,
    count: 5,
    limit: 5,
    offset: 0,
    messages: [
      { chat: "wxid_a", timestamp: 1, content: "hit1" },
      { chat: "wxid_a", timestamp: 2, content: "hit2" },
    ],
  };

  it("maps search response pagination and messages", () => {
    const result = adaptSearchResponse(raw);

    expect(result.totalCount).toBe(50);
    expect(result.count).toBe(5);
    expect(result.limit).toBe(5);
    expect(result.offset).toBe(0);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].content).toBe("hit1");
  });

  it("infers group metadata for search messages from backend username", () => {
    const result = adaptSearchResponse({
      total_count: 1,
      count: 1,
      limit: 20,
      offset: 0,
      messages: [
        {
          timestamp: 1710000000,
          time: "2024-03-10 12:00",
          sender: "Alice",
          type: "text",
          content: "Found content",
          local_id: 200,
          chat: "Work Group",
          username: "room123@chatroom",
        },
      ],
    });

    expect(result.messages[0]).toMatchObject({
      chat: "Work Group",
      username: "room123@chatroom",
      isGroup: true,
      chatType: "group",
    });
  });
});

// ── adaptStatsResponse ─────────────────────────────────────────

describe("adaptStatsResponse", () => {
  const full: RawStatsResponse = {
    chat: "wxid_chat",
    username: "wxid_chat",
    is_group: false,
    chat_type: "private",
    total: 500,
    sent_count: 300,
    received_count: 200,
    active_senders: 2,
    active_days: 30,
    first_message_time: 1717000000,
    last_message_time: 1717086400,
    query_since: 1717000000,
    query_until: 1717086400,
    query_range_label: "Last 30 days",
    by_type: [
      { type: "text", count: 400 },
      { type: "image", count: 80 },
      { type: "video", count: 20 },
    ],
    top_senders: [
      { sender: "wxid_me", count: 300, display: "Me" },
      { sender: "wxid_friend", count: 200 },
    ],
    by_hour: [
      { hour: 0, count: 10 },
      { hour: 12, count: 50 },
    ],
  };

  it("maps snake_case to camelCase for all fields", () => {
    const result = adaptStatsResponse(full);

    expect(result.chat).toBe("wxid_chat");
    expect(result.username).toBe("wxid_chat");
    expect(result.isGroup).toBe(false);
    expect(result.chatType).toBe("private");
    expect(result.total).toBe(500);
    expect(result.sentCount).toBe(300);
    expect(result.receivedCount).toBe(200);
    expect(result.activeSenders).toBe(2);
    expect(result.activeDays).toBe(30);
    expect(result.firstMessageTime).toBe(1717000000);
    expect(result.lastMessageTime).toBe(1717086400);
    expect(result.querySince).toBe(1717000000);
    expect(result.queryUntil).toBe(1717086400);
    expect(result.queryRangeLabel).toBe("Last 30 days");
    expect(result.byType).toEqual([
      { type: "text", count: 400 },
      { type: "image", count: 80 },
      { type: "video", count: 20 },
    ]);
    expect(result.byHour).toEqual([
      { hour: 0, count: 10 },
      { hour: 12, count: 50 },
    ]);
  });

  it("maps top_senders with display fallback to sender", () => {
    const result = adaptStatsResponse(full);

    expect(result.topSenders).toHaveLength(2);
    expect(result.topSenders[0]).toEqual({ sender: "wxid_me", count: 300, display: "Me" });
    expect(result.topSenders[1]).toEqual({ sender: "wxid_friend", count: 200, display: "wxid_friend" });
  });

  it("handles empty stats with defaults", () => {
    const result = adaptStatsResponse({ chat: "empty" });

    expect(result.chat).toBe("empty");
    expect(result.username).toBe("empty");
    expect(result.total).toBe(0);
    expect(result.sentCount).toBe(0);
    expect(result.receivedCount).toBe(0);
    expect(result.activeSenders).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.byType).toEqual([]);
    expect(result.topSenders).toEqual([]);
    expect(result.byHour).toEqual([]);
  });
});

// ── adaptDashboardTrendResponse ─────────────────────────────────

describe("adaptDashboardTrendResponse", () => {
  const raw: RawDashboardTrendResponse = {
    chat: "wxid_chat",
    window: "day",
    window_label: "Daily",
    from: 1717000000,
    to: 1717086400,
    count: 365,
    truncated: false,
    summary: "Trend analysis summary",
    source: "chatlog",
    daily: [
      { date: "2024-05-01", count: 10 },
      { date: "2024-05-02", count: 15 },
      { date: "2024-05-03", count: 8 },
    ],
  };

  it("maps daily array correctly", () => {
    const result = adaptDashboardTrendResponse(raw);

    expect(result.chat).toBe("wxid_chat");
    expect(result.window).toBe("day");
    expect(result.windowLabel).toBe("Daily");
    expect(result.from).toBe(1717000000);
    expect(result.to).toBe(1717086400);
    expect(result.count).toBe(365);
    expect(result.truncated).toBe(false);
    expect(result.summary).toBe("Trend analysis summary");
    expect(result.source).toBe("chatlog");
  });

  it("maps daily entries", () => {
    const result = adaptDashboardTrendResponse(raw);

    expect(result.daily).toHaveLength(3);
    expect(result.daily[0]).toEqual({ date: "2024-05-01", count: 10 });
    expect(result.daily[1]).toEqual({ date: "2024-05-02", count: 15 });
    expect(result.daily[2]).toEqual({ date: "2024-05-03", count: 8 });
  });

  it("handles minimal response with empty daily", () => {
    const result = adaptDashboardTrendResponse({});

    expect(result.chat).toBe("");
    expect(result.window).toBe("");
    expect(result.daily).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.truncated).toBe(false);
    expect(result.summary).toBe("");
  });
});

// ── normalizeChatType ──────────────────────────────────────────

describe("normalizeChatType", () => {
  it('returns "group" for chat_type "group"', () => {
    expect(normalizeChatType("group", "anything")).toBe("group");
  });

  it('returns "group" when username ends with @chatroom', () => {
    expect(normalizeChatType(undefined, "room123@chatroom")).toBe("group");
    expect(normalizeChatType("friend", "room123@chatroom")).toBe("group");
  });

  it('returns "official_account" for chat_type "official_account"', () => {
    expect(normalizeChatType("official_account", "anything")).toBe("official_account");
  });

  it('returns "official_account" when username starts with gh_', () => {
    expect(normalizeChatType(undefined, "gh_1234567890a")).toBe("official_account");
  });

  it('returns "folded" for chat_type "folded"', () => {
    expect(normalizeChatType("folded", "anything")).toBe("folded");
  });

  it('returns "private" for chat_type "private"', () => {
    expect(normalizeChatType("private", "wxid_user")).toBe("private");
  });

  it('returns "private" for undefined chat_type with normal username', () => {
    expect(normalizeChatType(undefined, "wxid_user")).toBe("private");
  });

  it('returns "private" for empty string chat_type', () => {
    expect(normalizeChatType("", "wxid_user")).toBe("private");
  });

  it('returns "unknown" for unrecognized chat_type', () => {
    expect(normalizeChatType("weird_type", "wxid_user")).toBe("unknown");
  });
});

// ── adaptSessionToConversation ─────────────────────────────────

describe("adaptSessionToConversation", () => {
  const raw: RawSession = {
    username: "wxid_chat",
    chat: "Alice Chat",
    is_group: false,
    chat_type: "private",
    summary: "Last message preview",
    timestamp: 1717000000,
    time: "2024-05-29 12:00:00",
  };

  it("maps session to conversation shape", () => {
    const result = adaptSessionToConversation(raw);

    expect(result.id).toBe("wxid_chat");
    expect(result.username).toBe("wxid_chat");
    expect(result.displayName).toBe("Alice Chat");
    expect(result.chatType).toBe("private");
    expect(result.isGroup).toBe(false);
    expect(result.summary).toBe("Last message preview");
    expect(result.timestamp).toBe(1717000000);
    expect(result.timeLabel).toBe("2024-05-29 12:00:00");
    expect(result.source).toBe("session");
  });

  it("detects group sessions from username", () => {
    const result = adaptSessionToConversation({
      username: "room123@chatroom",
      chat: "Group Chat",
    });
    expect(result.isGroup).toBe(true);
    expect(result.chatType).toBe("group");
  });

  it("falls back displayName to username when chat is missing", () => {
    const result = adaptSessionToConversation({
      username: "wxid_only",
    });
    expect(result.displayName).toBe("wxid_only");
  });
});

// ── adoptContactToConversation ─────────────────────────────────

describe("adoptContactToConversation", () => {
  const raw: RawContact = {
    username: "wxid_bob",
    alias: "bob",
    remark: "Brother",
    nickname: "Bob",
    display: "Bob The Builder",
    is_friend: true,
  };

  it("maps contact to conversation with embedded contact detail", () => {
    const result = adoptContactToConversation(raw);

    expect(result.id).toBe("wxid_bob");
    expect(result.username).toBe("wxid_bob");
    expect(result.displayName).toBe("Bob The Builder");
    expect(result.chatType).toBe("private");
    expect(result.isGroup).toBe(false);
    expect(result.source).toBe("contact");
    expect(result.contact).toBeDefined();
    expect(result.contact?.userName).toBe("wxid_bob");
    expect(result.contact?.nickName).toBe("Bob The Builder");
  });

  it("falls back displayName to username for minimal contact", () => {
    const result = adoptContactToConversation({ username: "wxid_min" });

    expect(result.displayName).toBe("wxid_min");
    expect(result.contact?.nickName).toBe("wxid_min");
  });
});

// ── adoptChatRoomToConversation ────────────────────────────────

describe("adoptChatRoomToConversation", () => {
  const raw: RawChatRoom = {
    name: "room123@chatroom",
    remark: "Work Group",
    nickname: "Work",
    display: "Work Chat",
    owner: "wxid_owner",
    user_count: 42,
  };

  it("maps chatroom to conversation with embedded chatroom detail", () => {
    const result = adoptChatRoomToConversation(raw);

    expect(result.id).toBe("room123@chatroom");
    expect(result.username).toBe("room123@chatroom");
    expect(result.displayName).toBe("Work Chat");
    expect(result.chatType).toBe("group");
    expect(result.isGroup).toBe(true);
    expect(result.source).toBe("chatroom");
    expect(result.chatroom).toBeDefined();
    expect(result.chatroom?.name).toBe("room123@chatroom");
    expect(result.chatroom?.nickName).toBe("Work Chat");
    expect(result.chatroom?.userCount).toBe(42);
  });

  it("falls back displayName to name for minimal chatroom", () => {
    const result = adoptChatRoomToConversation({ name: "bare_room" });

    expect(result.displayName).toBe("bare_room");
    expect(result.chatroom?.nickName).toBe("bare_room");
  });
});

// ── mergeConversations ─────────────────────────────────────────

describe("mergeConversations", () => {
  const sessions: RawSessionsResponse = {
    sessions: [
      { username: "wxid_a", chat: "Alice", summary: "Hey!", timestamp: 300, time: "t3" },
      { username: "wxid_b", chat: "Bob", summary: "Bye!", timestamp: 200, time: "t2" },
      { username: "group1@chatroom", chat: "Work Group", summary: "Meeting", timestamp: 100, time: "t1" },
    ],
  };

  const contacts: RawContactsResponse = {
    count: 1,
    contacts: [
      { username: "wxid_a", display: "Alice Display", remark: "Al", nickname: "alice" },
    ],
  };

  const chatrooms: RawChatRoomsResponse = {
    count: 1,
    chatrooms: [
      { name: "group1@chatroom", display: "Work Group Display", user_count: 10 },
    ],
  };

  it("orders by session timestamp descending", () => {
    const result = mergeConversations(sessions, contacts, chatrooms);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("wxid_a");
    expect(result[0].timestamp).toBe(300);
    expect(result[1].id).toBe("wxid_b");
    expect(result[1].timestamp).toBe(200);
    expect(result[2].id).toBe("group1@chatroom");
    expect(result[2].timestamp).toBe(100);
  });

  it("enriches session with contact data when available", () => {
    const result = mergeConversations(sessions, contacts, chatrooms);

    const alice = result.find(c => c.id === "wxid_a");
    expect(alice?.displayName).toBe("Alice");
    expect((alice as { contact?: { nickName: string } })?.contact).toBeDefined();
    expect((alice as { contact?: { nickName: string } })?.contact?.nickName).toBe("Alice Display");
  });

  it("enriches session with chatroom data when available", () => {
    const result = mergeConversations(sessions, contacts, chatrooms);

    const group = result.find(c => c.id === "group1@chatroom");
    expect(group?.displayName).toBe("Work Group");
    expect((group as { chatroom?: { nickName: string } })?.chatroom).toBeDefined();
    expect((group as { chatroom?: { nickName: string } })?.chatroom?.nickName).toBe("Work Group Display");
  });

  it("deduplicates by username (keeps first session entry)", () => {
    const dupSessions: RawSessionsResponse = {
      sessions: [
        { username: "wxid_a", chat: "Alice", summary: "First", timestamp: 300 },
        { username: "wxid_a", chat: "Alice", summary: "Second", timestamp: 200 },
      ],
    };

    const result = mergeConversations(dupSessions, { count: 0, contacts: [] }, { count: 0, chatrooms: [] });

    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe("First");
  });

  it("keeps later session with higher timestamp when deduping", () => {
    const dupSessions: RawSessionsResponse = {
      sessions: [
        { username: "wxid_a", chat: "Alice", summary: "Older", timestamp: 100 },
        { username: "wxid_a", chat: "Alice", summary: "Newer", timestamp: 300 },
      ],
    };

    const result = mergeConversations(dupSessions, { count: 0, contacts: [] }, { count: 0, chatrooms: [] });

    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe("Newer");
    expect(result[0].timestamp).toBe(300);
  });

  it("handles empty input gracefully", () => {
    const result = mergeConversations(
      { sessions: [] },
      { count: 0, contacts: [] },
      { count: 0, chatrooms: [] },
    );

    expect(result).toEqual([]);
  });
});
