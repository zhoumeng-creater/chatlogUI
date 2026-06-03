import { describe, expect, it } from "vitest";
import {
  adaptFavoritesResponse,
  adaptMembersResponse,
  adaptNewMessagesResponse,
  adaptUnreadResponse,
} from "./chatExtensionsAdapters";
import type {
  RawFavoritesResponse,
  RawMembersResponse,
  RawNewMessagesResponse,
  RawUnreadResponse,
} from "./chatlogRawTypes";

describe("chatExtensionsAdapters", () => {
  it("adapts unread sessions with private summary fields preserved for privacy-aware UI", () => {
    const raw: RawUnreadResponse = {
      total: 1,
      sessions: [
        {
          chat: "Synthetic Group",
          username: "group_synthetic_001@chatroom",
          is_group: true,
          chat_type: "group",
          unread: 3,
          last_msg_type: "text",
          last_sender: "member_synthetic_001",
          summary: "Synthetic unread summary",
          timestamp: 1_800_000_000,
          time: "2026-06-02 12:00",
        },
      ],
    };

    const result = adaptUnreadResponse(raw);

    expect(result.total).toBe(1);
    expect(result.sessions[0]).toMatchObject({
      id: "group_synthetic_001@chatroom",
      displayName: "Synthetic Group",
      unread: 3,
      lastSender: "member_synthetic_001",
      summary: "Synthetic unread summary",
    });
  });

  it("adapts members response to stable row ids", () => {
    const raw: RawMembersResponse = {
      chat: "Synthetic Group",
      username: "group_synthetic_001@chatroom",
      count: 2,
      members: [
        { username: "member_synthetic_owner", display: "Synthetic Owner", is_owner: true },
        { username: "member_synthetic_guest", display: "Synthetic Guest", is_owner: false },
      ],
    };

    const result = adaptMembersResponse(raw);

    expect(result.count).toBe(2);
    expect(result.members.map((member) => member.id)).toEqual([
      "member_synthetic_owner",
      "member_synthetic_guest",
    ]);
    expect(result.members[0].isOwner).toBe(true);
  });

  it("adapts new messages and preserves backend new_state", () => {
    const raw: RawNewMessagesResponse = {
      count: 1,
      new_state: { "group_synthetic_001@chatroom": 1_800_000_001 },
      messages: [
        {
          chat: "Synthetic Group",
          username: "group_synthetic_001@chatroom",
          is_group: true,
          chat_type: "group",
          local_id: 42,
          timestamp: 1_800_000_001,
          time: "2026-06-02 12:01",
          sender: "member_synthetic_guest",
          type: "text",
          content: "Synthetic incremental message",
        },
      ],
    };

    const result = adaptNewMessagesResponse(raw);

    expect(result.count).toBe(1);
    expect(result.newState).toEqual({ "group_synthetic_001@chatroom": 1_800_000_001 });
    expect(result.messages[0].id).toBe("group_synthetic_001@chatroom-42");
  });

  it("adapts favorites with type labels and private preview fields", () => {
    const raw: RawFavoritesResponse = {
      count: 1,
      items: [
        {
          id: "favorite_synthetic_001",
          type: "text",
          type_num: 1,
          time: "2026-06-02 12:02",
          timestamp: 1_800_000_002,
          preview: "Synthetic favorite preview",
          from: "member_synthetic_guest",
          chat: "Synthetic Group",
        },
      ],
    };

    const result = adaptFavoritesResponse(raw);

    expect(result.items[0]).toMatchObject({
      id: "favorite_synthetic_001",
      kindLabel: "文本",
      preview: "Synthetic favorite preview",
      from: "member_synthetic_guest",
      chat: "Synthetic Group",
    });
  });
});
