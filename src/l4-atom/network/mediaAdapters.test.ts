import { describe, expect, it } from "vitest";
import {
  adaptFavoriteResponse,
  adaptMediaAttachments,
  adaptMembersResponse,
  adaptNewMessagesResponse,
  adaptUnreadResponse,
  buildMediaResourceUrl,
} from "./mediaAdapters";
import type {
  RawFavoriteMessage,
  RawHistoryMessage,
  RawMember,
  RawNewMessage,
} from "./chatlogRawTypes";

describe("mediaAdapters", () => {
  it("extracts typed attachments from backend-shaped history messages", () => {
    const raw: RawHistoryMessage = {
      type: "3",
      content: "photo",
      media_type: "image",
      media_key: "image-secret-key",
      image_path: "C:/Users/Synthetic/private.jpg",
      media_url: "http://127.0.0.1:5030/image/image-secret-key",
    };

    const [attachment] = adaptMediaAttachments(raw);

    expect(attachment).toMatchObject({
      kind: "image",
      resourceKind: "image",
      resourceKey: "image-secret-key",
      source: "history",
      sourceLabel: "当前会话",
      label: "图片",
      redactedEndpointLabel: "media:image",
    });
    expect(JSON.stringify(attachment)).not.toContain("C:/Users/Synthetic/private.jpg");
  });

  it("collapses repeated media and image key aliases into one logical attachment", () => {
    const attachments = adaptMediaAttachments({
      local_id: 99,
      timestamp: 1_780_000_001,
      media_type: "image",
      media_key: "same-image-key",
      image_key: "same-image-key",
      media_keys: ["same-image-key", "same-image-key"],
      image_keys: ["same-image-key", "same-image-key"],
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      kind: "image",
      resourceKind: "image",
      resourceKey: "same-image-key",
    });
  });

  it("does not treat video cover image keys as extra video attachments", () => {
    const attachments = adaptMediaAttachments({
      local_id: 100,
      timestamp: 1_780_000_002,
      media_type: "video",
      media_key: "video-resource-key",
      image_key: "video-cover-key",
      image_keys: ["video-cover-key", "video-cover-thumb-key"],
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      kind: "video",
      resourceKind: "video",
      resourceKey: "video-resource-key",
    });
  });

  it("builds local sidecar media resource URLs without query strings", () => {
    const [attachment] = adaptMediaAttachments({
      media_type: "voice",
      media_key: "voice key/with spaces",
    });

    expect(buildMediaResourceUrl(attachment)).toBe(
      "http://127.0.0.1:5030/voice/voice%20key%2Fwith%20spaces",
    );
  });

  it("accepts direct media URLs from validated loopback service origins", () => {
    const [attachment] = adaptMediaAttachments({
      media_type: "image",
      media_url: "http://127.0.0.1:6041/image/image-secret-key",
    });

    expect(attachment.directUrl).toBe("http://127.0.0.1:6041/image/image-secret-key");
  });

  it("adapts favorites with attachments and safe display metadata", () => {
    const favorite: RawFavoriteMessage = {
      id: "fav-1",
      chat: "wxid_synthetic_private_chat",
      sender: "wxid_synthetic_sender",
      time: "2026-06-02 10:00",
      content: "saved photo",
      type: "image",
      media_key: "favorite-secret-key",
      media_type: "image",
    };

    const result = adaptFavoriteResponse({ count: 1, favorites: [favorite] });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].attachments[0]).toMatchObject({
      kind: "image",
      resourceKey: "favorite-secret-key",
      sourceLabel: "收藏",
      time: "2026-06-02 10:00",
    });
    expect(JSON.stringify(result)).not.toContain("private_chat");
  });

  it("keeps safe message anchors while stripping unsafe file names from attachments", () => {
    const [attachment] = adaptMediaAttachments({
      local_id: 42,
      seq: 7,
      timestamp: 1_780_000_000,
      time: "2026-06-02 10:00",
      media_type: "image",
      media_key: "image-secret-key",
      file_name: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private\\image.jpg",
    });

    expect(attachment).toMatchObject({
      localId: 42,
      messageId: "7",
      timestamp: 1_780_000_000,
      time: "2026-06-02 10:00",
    });
    expect(attachment.fileName).toBeUndefined();
    expect(JSON.stringify(attachment)).not.toContain("C:\\Users");
    expect(JSON.stringify(attachment)).not.toContain("wxid_synthetic_private");
  });

  it("adapts members, unread counts, and incremental messages", () => {
    const member: RawMember = {
      username: "wxid_synthetic_member",
      display: "Alice",
      remark: "",
      nickname: "Ali",
    };
    const newMessage: RawNewMessage = {
      id: "new-1",
      chat: "room@chatroom",
      sender: "wxid_synthetic_sender",
      time: "2026-06-02 10:10",
      content: "new media",
      media_type: "file",
      media_key: "file-secret-key",
    };

    expect(adaptMembersResponse({ count: 1, members: [member] }).members[0]).toMatchObject({
      username: "wxid_synthetic_member",
      displayName: "Alice",
    });
    expect(adaptUnreadResponse({ total: 3, chats: [{ chat: "room@chatroom", count: 3 }] })).toMatchObject({
      total: 3,
      chats: [{ chat: "room@chatroom", count: 3 }],
    });
    expect(adaptNewMessagesResponse({ count: 1, messages: [newMessage] }).messages[0].attachments[0]).toMatchObject({
      kind: "file",
      resourceKey: "file-secret-key",
    });
  });
});
