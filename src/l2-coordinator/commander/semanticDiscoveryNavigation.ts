import type { SemanticSearchResultItem } from "@/l2-coordinator/api-docs/semantic";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";

export type SemanticSearchNavigationTarget =
  | {
      kind: "ready";
      conversationId: string;
      chat: string;
      localId: number;
      message: string;
    }
  | {
      kind: "missing";
      message: string;
    };

export function resolveSemanticSearchTarget(
  result: SemanticSearchResultItem,
  conversations: Conversation[],
  privacyOn: boolean,
): SemanticSearchNavigationTarget {
  const chat = result.chat.trim();
  const conversation = conversations.find((entry) => entry.username === chat);

  if (!chat || !conversation) {
    return {
      kind: "missing",
      message: "未找到可打开的会话。请先在左侧会话列表中刷新数据。",
    };
  }

  const label = privacyOn
    ? "当前会话"
    : (result.chatName || conversation.displayName || conversation.username);
  const localId = Number.isFinite(result.localId) ? result.localId : 0;
  const suffix = localId > 0 ? `的第 ${localId} 条附近` : "附近";

  return {
    kind: "ready",
    conversationId: conversation.id,
    chat: conversation.username,
    localId,
    message: `已定位到 ${label} ${suffix}。`,
  };
}
