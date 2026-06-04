import type { QAMessage } from "@/l2-coordinator/api-docs/semantic";

export function getSemanticQACopyText(
  message: QAMessage | undefined,
  privacyOn: boolean,
): string | null {
  if (!message || privacyOn || message.role !== "assistant") return null;
  const text = message.content.trim();
  return text ? text : null;
}
