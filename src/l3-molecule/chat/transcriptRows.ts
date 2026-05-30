import type { ChatMessage } from "@l2/data-clerk/stores/useChatStore";
import { groupMessagesByDate } from "./transcriptDisplay";

export type TranscriptRow =
  | { kind: "date"; id: string; dateLabel: string }
  | { kind: "message"; id: string; message: ChatMessage };

export function buildTranscriptRows(messages: ChatMessage[]): TranscriptRow[] {
  return groupMessagesByDate(messages).flatMap((group) => [
    {
      kind: "date" as const,
      id: `date-${group.dateLabel}`,
      dateLabel: group.dateLabel,
    },
    ...group.messages.map((message) => ({
      kind: "message" as const,
      id: message.id,
      message,
    })),
  ]);
}

export function estimateTranscriptRowHeight(row: TranscriptRow): number {
  return row.kind === "date" ? 32 : 92;
}
