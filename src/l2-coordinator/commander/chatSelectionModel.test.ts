import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import {
  createEmptyChatSelectionState,
  deriveSelectedMessages,
  enterSelectionMode,
  exitSelectionMode,
  getSelectionPrivacySummary,
  reconcileSelectionWithMessages,
  selectVisibleMessages,
  toggleMessageSelection,
} from "./chatSelectionModel";

function message(id: string, time: string, type = "text"): ChatMessage {
  return {
    id,
    localId: Number(id),
    timestamp: Number(id),
    time,
    sender: "Synthetic Sender",
    senderName: "Synthetic Sender",
    type,
    content: `Synthetic message ${id}`,
    chat: "Synthetic Room",
    username: "room_synthetic@chatroom",
    isGroup: true,
    chatType: "group",
    direction: "other",
  };
}

const messages = [
  message("1", "2024-04-28 09:20"),
  message("2", "2024-04-28 09:21", "image"),
  message("3", "2024-04-28 09:22"),
];

describe("chatSelectionModel", () => {
  it("enters and exits selection mode", () => {
    const entered = enterSelectionMode(createEmptyChatSelectionState());
    expect(entered.mode).toBe(true);

    expect(exitSelectionMode(entered)).toEqual(createEmptyChatSelectionState());
  });

  it("toggles one message and a range from the last selected message", () => {
    const one = toggleMessageSelection({
      state: enterSelectionMode(createEmptyChatSelectionState()),
      messages,
      messageId: "1",
    });
    const range = toggleMessageSelection({
      state: one,
      messages,
      messageId: "3",
      range: true,
    });

    expect(range.selectedMessageIds).toEqual(["1", "2", "3"]);
    expect(range.lastSelectedMessageId).toBe("3");
  });

  it("selects visible messages and clears stale selected ids when messages change", () => {
    const selected = selectVisibleMessages({
      state: enterSelectionMode(createEmptyChatSelectionState()),
      visibleMessages: messages,
    });
    const reconciled = reconcileSelectionWithMessages({
      state: selected,
      messages: messages.slice(1),
    });

    expect(selected.selectedMessageIds).toEqual(["1", "2", "3"]);
    expect(reconciled.selectedMessageIds).toEqual(["2", "3"]);
  });

  it("returns selected messages in transcript order", () => {
    const state = {
      mode: true,
      selectedMessageIds: ["3", "1"],
      lastSelectedMessageId: "3",
      status: null,
    };

    expect(deriveSelectedMessages({ state, messages }).map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("summarizes selected messages without exposing private content", () => {
    const state = selectVisibleMessages({
      state: enterSelectionMode(createEmptyChatSelectionState()),
      visibleMessages: messages,
    });
    const summary = getSelectionPrivacySummary({ state, messages, privacyOn: true });

    expect(summary).toContain("已选 3 条");
    expect(summary).toContain("2024-04-28 09:20 - 2024-04-28 09:22");
    expect(summary).toContain("文本 2 条");
    expect(summary).toContain("图片 1 条");
    expect(summary).not.toContain("Synthetic message");
    expect(summary).not.toContain("Synthetic Sender");
  });
});
