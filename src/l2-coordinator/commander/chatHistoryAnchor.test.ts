import { describe, expect, it } from "vitest";
import type { ChatMessage, ChatMessageAnchor } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import {
  buildAnchorHistoryRequest,
  findAnchoredMessage,
} from "./chatHistoryAnchor";

const anchor: ChatMessageAnchor = {
  source: "search",
  chat: "wxid_synthetic_user",
  messageId: "wxid_synthetic_user-42",
  localId: 42,
  timestamp: 1_714_288_000,
  time: "2024-04-28 09:20",
};

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "message-1",
    localId: 1,
    timestamp: 1_714_288_000,
    time: "2024-04-28 09:20",
    sender: "Synthetic Sender",
    type: "text",
    content: "Synthetic content",
    chat: "Synthetic User",
    username: "wxid_synthetic_user",
    isGroup: false,
    chatType: "friend",
    direction: "unknown",
    ...overrides,
  };
}

describe("chat history anchor helpers", () => {
  it("builds a bounded history request around the hit timestamp", () => {
    expect(buildAnchorHistoryRequest(anchor, { limit: 50, windowSeconds: 300 })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
      since: 1_714_287_700,
      until: 1_714_288_300,
    });
  });

  it("falls back to the first history page when no timestamp is available", () => {
    expect(buildAnchorHistoryRequest({ ...anchor, timestamp: null }, { limit: 50, windowSeconds: 300 })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
    });
  });

  it("matches anchored messages by local id before adapted message id", () => {
    const match = message({ id: "different-adapted-id", localId: 42 });

    expect(findAnchoredMessage([
      message({ id: "wxid_synthetic_user-42", localId: 100 }),
      match,
    ], anchor)).toBe(match);
  });

  it("falls back to adapted message id and timestamp when local id is unavailable", () => {
    const messageIdMatch = message({ id: "wxid_synthetic_user-42", localId: 100, timestamp: 111 });
    const timestampMatch = message({ id: "other-message", localId: 100, timestamp: 1_714_288_000 });

    expect(findAnchoredMessage([messageIdMatch], { ...anchor, localId: null })).toBe(messageIdMatch);
    expect(findAnchoredMessage([timestampMatch], { ...anchor, localId: null, messageId: "" })).toBe(timestampMatch);
  });

  it("returns null when the loaded window does not contain the hit", () => {
    expect(findAnchoredMessage([
      message({ id: "other-message", localId: 100, timestamp: 111 }),
    ], anchor)).toBeNull();
  });
});
