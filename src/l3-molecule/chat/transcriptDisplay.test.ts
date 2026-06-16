import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import {
  getMessageAttachmentSummary,
  formatMessageClock,
  getMessageKindLabel,
  getMessageSenderDisplay,
  getTranscriptTone,
  groupMessagesByDate,
  shouldShowSender,
} from "./transcriptDisplay";

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: overrides.id ?? "m1",
    localId: overrides.localId ?? 1,
    timestamp: overrides.timestamp ?? 1_700_000_000,
    time: overrides.time ?? "2026-05-29 10:00",
    sender: overrides.sender ?? "wxid_synthetic_sender",
    senderName: overrides.senderName,
    talker: overrides.talker,
    talkerName: overrides.talkerName,
    isSelf: overrides.isSelf ?? false,
    type: overrides.type ?? "text",
    content: overrides.content ?? "hello",
    chat: overrides.chat ?? "wxid_synthetic_chat",
    username: overrides.username ?? "wxid_synthetic_chat",
    isGroup: overrides.isGroup ?? false,
    chatType: overrides.chatType ?? "private",
    direction: overrides.direction ?? "unknown",
    mediaType: overrides.mediaType,
    mediaUrl: overrides.mediaUrl,
    imageUrl: overrides.imageUrl,
    attachments: overrides.attachments,
  };
}

describe("transcriptDisplay", () => {
  it("renders unknown direction as neutral", () => {
    expect(getTranscriptTone(message({ direction: "unknown" }))).toBe("neutral");
    expect(getTranscriptTone(message({ direction: "self" }))).toBe("self");
    expect(getTranscriptTone(message({ direction: "other" }))).toBe("other");
  });

  it("uses media labels without hiding text fallbacks", () => {
    expect(getMessageKindLabel(message({ mediaType: "image" }))).toBe("图片");
    expect(getMessageKindLabel(message({ type: "34" }))).toBe("语音");
    expect(getMessageKindLabel(message({ type: "text" }))).toBe("");
  });

  it("summarizes typed attachments instead of generic media availability", () => {
    expect(getMessageAttachmentSummary(message({
      mediaType: "image",
      attachments: [{
        id: "a1",
        kind: "image",
        resourceKind: "image",
        resourceKey: "secret-key",
        label: "图片",
        redactedEndpointLabel: "media:image",
        source: "history",
      }],
    }), false)).toBe("1 个附件：图片");
    expect(getMessageAttachmentSummary(message({
      mediaType: "image",
      attachments: [{
        id: "a1",
        kind: "image",
        resourceKind: "image",
        resourceKey: "secret-key",
        label: "图片",
        redactedEndpointLabel: "media:image",
        source: "history",
      }],
    }), true)).toBe("1 个附件：已隐藏媒体");
  });

  it("shows sender only for group messages not sent by self", () => {
    expect(shouldShowSender(message({ isGroup: true, direction: "unknown" }))).toBe(true);
    expect(shouldShowSender(message({ isGroup: true, direction: "self" }))).toBe(false);
    expect(shouldShowSender(message({ isGroup: false, direction: "other" }))).toBe(false);
  });

  it("uses sender display names supplied by L2/L4 for group metadata", () => {
    expect(getMessageSenderDisplay(message({
      sender: "wxid_synthetic_member",
      senderName: "Synthetic Member",
    }))).toBe("Synthetic Member");
    expect(getMessageSenderDisplay(message({
      sender: "wxid_synthetic_member",
      senderName: "",
    }))).toBe("wxid_synthetic_member");
  });

  it("groups messages by calendar date", () => {
    const groups = groupMessagesByDate([
      message({ id: "a", time: "2026-05-28 23:59" }),
      message({ id: "b", time: "2026-05-29 00:01" }),
    ]);

    expect(groups.map((group) => group.dateLabel)).toEqual(["2026-05-28", "2026-05-29"]);
    expect(groups[1].messages.map((item) => item.id)).toEqual(["b"]);
  });

  it("formats invalid times as an empty string", () => {
    expect(formatMessageClock("not-a-date")).toBe("");
  });
});
