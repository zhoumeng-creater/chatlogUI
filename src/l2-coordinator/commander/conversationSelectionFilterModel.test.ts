import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import {
  buildMessageSelectionFilterModel,
  selectMessageIdsByFilter,
  validateMessageSelectionFilter,
} from "./conversationSelectionFilterModel";

const messages: ChatMessage[] = [
  message("m1", "Alice", "2026-07-04 23:59"),
  message("m2", "Bob", "2026-07-05 09:00"),
  message("m3", "Alice", "2026-07-05 10:00"),
];

describe("conversationSelectionFilterModel", () => {
  it("builds privacy-safe sender options for loaded messages", () => {
    const model = buildMessageSelectionFilterModel({ messages, privacyOn: true });

    expect(model.senderOptions).toEqual([
      { value: "all", label: "全部对象", count: 3 },
      { value: "sender-1", label: "*****", count: 2 },
      { value: "sender-2", label: "***", count: 1 },
    ]);
    expect(JSON.stringify(model)).not.toContain("Alice");
    expect(JSON.stringify(model)).not.toContain("Bob");
  });

  it("selects loaded messages by sender and date range", () => {
    const model = buildMessageSelectionFilterModel({ messages, privacyOn: false });

    expect(selectMessageIdsByFilter({
      messages,
      senderOptions: model.senderOptions,
      filters: { sender: "sender-1", startDate: "2026-07-05", endDate: "2026-07-05" },
    })).toEqual(["m3"]);
  });

  it("validates reversed date ranges", () => {
    expect(validateMessageSelectionFilter({
      sender: "all",
      startDate: "2026-07-06",
      endDate: "2026-07-05",
    })).toBe("开始日期不能晚于结束日期。");
  });
});

function message(id: string, senderName: string, time: string): ChatMessage {
  return {
    id,
    localId: Number(id.slice(1)),
    timestamp: 1,
    time,
    sender: senderName,
    senderName,
    type: "text",
    content: "Synthetic message",
    chat: "synthetic-room",
    username: "synthetic-room",
    isGroup: true,
    chatType: "group",
    direction: "other",
  };
}
