import { describe, expect, it } from "vitest";
import type {
  ChatMessage,
  ChatMessageAnchor,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import {
  buildAnchorHistoryRequest,
  buildNearbyAnchorHistoryRequest,
  findExactAnchorPage,
  findAnchoredMessage,
  findNearbyAnchoredMessage,
} from "./chatHistoryAnchor";

const anchor: ChatMessageAnchor = {
  source: "search",
  chat: "wxid_synthetic_user",
  messageId: "wxid_synthetic_user-42",
  seq: 9_001,
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
  it("loads the exact timestamp second when a stable sequence identity is available", () => {
    expect(buildAnchorHistoryRequest(anchor, { limit: 50, windowSeconds: 300 })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
      since: 1_714_288_000,
      until: 1_714_288_000,
    });
  });

  it("uses a bounded nearby window only when exact sequence identity is unavailable", () => {
    expect(
      buildAnchorHistoryRequest({ ...anchor, seq: null }, { limit: 50, windowSeconds: 300 }),
    ).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
      since: 1_714_287_700,
      until: 1_714_288_300,
    });
  });

  it("builds the broader time window only for an explicit nearby fallback", () => {
    expect(buildNearbyAnchorHistoryRequest(anchor, { limit: 50, windowSeconds: 300 })).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
      since: 1_714_287_700,
      until: 1_714_288_300,
    });
  });

  it("falls back to the first history page when no timestamp is available", () => {
    expect(
      buildAnchorHistoryRequest(
        { ...anchor, seq: null, timestamp: null },
        { limit: 50, windowSeconds: 300 },
      ),
    ).toEqual({
      chat: "wxid_synthetic_user",
      limit: 50,
      offset: 0,
    });
  });

  it("matches anchored messages by local id before adapted message id", () => {
    const match = message({ id: "different-adapted-id", localId: 42 });

    expect(
      findAnchoredMessage([message({ id: "wxid_synthetic_user-42", localId: 100 }), match], anchor),
    ).toBe(match);
  });

  it("matches canonical search hits by stable sequence before adapted ids", () => {
    const match = message({
      id: "history-adapter-id",
      seq: 9_001,
      localId: 700,
      timestamp: 111,
    });

    expect(
      findAnchoredMessage(
        [message({ id: anchor.messageId, seq: 100, localId: 42 }), match],
        anchor,
      ),
    ).toBe(match);
  });

  it("pages through one exact timestamp second until the stable sequence is found", async () => {
    const offsets: number[] = [];
    const firstPage = Array.from({ length: 50 }, (_, index) =>
      message({
        id: `same-second-${index}`,
        seq: 100 + index,
        localId: 100 + index,
      }),
    );
    const exact = message({ id: "adapter-exact", seq: anchor.seq ?? 0, localId: 999 });

    const result = await findExactAnchorPage({
      anchor,
      limit: 50,
      windowSeconds: 300,
      fetchPage: async (request) => {
        offsets.push(request.offset ?? 0);
        return {
          messages: request.offset === 0 ? firstPage : [exact],
          totalCount: 51,
          offset: request.offset ?? 0,
        };
      },
    });

    expect(offsets).toEqual([0, 50]);
    expect(result.hit).toBe(exact);
    expect(result.page.messages).toEqual([exact]);
  });

  it("does not report a false miss when an exact sequence is beyond one thousand same-second rows", async () => {
    const offsets: number[] = [];
    const exact = message({ id: "deep-exact", seq: anchor.seq ?? 0, localId: 9_999 });

    const result = await findExactAnchorPage({
      anchor,
      limit: 50,
      windowSeconds: 300,
      fetchPage: async (request) => {
        const offset = request.offset ?? 0;
        offsets.push(offset);
        return {
          messages:
            offset === 1_050
              ? [exact]
              : Array.from({ length: 50 }, (_, index) =>
                  message({ id: `same-second-${offset + index}`, seq: 10_000 + offset + index }),
                ),
          totalCount: 1_051,
          offset,
        };
      },
    });

    expect(offsets[offsets.length - 1]).toBe(1_050);
    expect(result.hit).toBe(exact);
  });

  it("falls back to adapted message id when stable numeric identities are unavailable", () => {
    const messageIdMatch = message({ id: "wxid_synthetic_user-42", localId: 100, timestamp: 111 });

    expect(findAnchoredMessage([messageIdMatch], { ...anchor, seq: null, localId: null })).toBe(
      messageIdMatch,
    );
  });

  it("never treats a timestamp-only match as an exact identity match", () => {
    const timestampMatch = message({
      id: "other-message",
      seq: 100,
      localId: 100,
      timestamp: 1_714_288_000,
    });
    const timestampOnlyAnchor = { ...anchor, seq: null, localId: null, messageId: "" };

    expect(findAnchoredMessage([timestampMatch], timestampOnlyAnchor)).toBeNull();
    expect(findNearbyAnchoredMessage([timestampMatch], timestampOnlyAnchor)).toBe(timestampMatch);
  });

  it("returns null when the loaded window does not contain the hit", () => {
    expect(
      findAnchoredMessage([message({ id: "other-message", localId: 100, timestamp: 111 })], anchor),
    ).toBeNull();
  });
});
