import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { buildTranscriptRows, estimateTranscriptRowHeight } from "./transcriptRows";

function message(id: string, date: string): ChatMessage {
  return {
    id,
    localId: Number(id.replace(/\D/g, "")) || 0,
    timestamp: Date.parse(date) / 1000,
    time: `${date} 10:00:00`,
    sender: "Alice",
    type: "text",
    content: `message ${id}`,
    chat: "wxid_synthetic_a",
    username: "wxid_synthetic_a",
    isGroup: false,
    chatType: "private",
    direction: "unknown",
  };
}

describe("transcriptRows", () => {
  it("creates date and message rows in render order", () => {
    const rows = buildTranscriptRows([
      message("m1", "2026-05-29"),
      message("m2", "2026-05-29"),
      message("m3", "2026-05-30"),
    ]);

    expect(rows.map((row) => row.kind)).toEqual(["date", "message", "message", "date", "message"]);
  });

  it("keeps row count to one date row per date plus messages", () => {
    const messages = Array.from({ length: 10000 }, (_, index) =>
      message(`m${index}`, "2026-05-30"),
    );

    expect(buildTranscriptRows(messages)).toHaveLength(10001);
  });

  it("uses smaller estimates for date rows than message rows", () => {
    const [dateRow, messageRow] = buildTranscriptRows([message("m1", "2026-05-30")]);

    expect(estimateTranscriptRowHeight(dateRow)).toBeLessThan(estimateTranscriptRowHeight(messageRow));
  });
});
