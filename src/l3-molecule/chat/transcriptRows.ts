import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { groupMessagesByDate } from "./transcriptDisplay";

export type TranscriptRow =
  | { kind: "date"; id: string; dateLabel: string }
  | { kind: "message"; id: string; message: ChatMessage };

export function buildTranscriptRows(messages: ChatMessage[]): TranscriptRow[] {
  const rows: TranscriptRow[] = [];

  for (const [groupIndex, group] of groupMessagesByDate(messages).entries()) {
    rows.push({
      kind: "date",
      id: `date:${group.dateLabel}:${groupIndex}`,
      dateLabel: group.dateLabel,
    });

    for (const message of group.messages) {
      rows.push({
        kind: "message",
        id: `message:${message.id}`,
        message,
      });
    }
  }

  return rows;
}

export function estimateTranscriptRowHeight(row: TranscriptRow): number {
  return row.kind === "date" ? 32 : 92;
}
