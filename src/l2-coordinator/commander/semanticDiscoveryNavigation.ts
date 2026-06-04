interface SemanticNavigationConversation {
  id: string;
  username: string;
  displayName: string;
}

export interface SemanticSearchNavigationResult {
  chat: string;
  chatLabel?: string;
  localId?: number;
}

export interface SemanticSearchNavigationInput {
  result: SemanticSearchNavigationResult;
  conversations: SemanticNavigationConversation[];
  privacyOn: boolean;
}

export interface SemanticSearchNavigationTarget {
  status: "ready" | "missing";
  conversationId: string;
  chat: string;
  localId?: number;
  message: string;
}

export function resolveSemanticSearchNavigation(
  input: SemanticSearchNavigationInput,
): SemanticSearchNavigationTarget {
  const match = input.conversations.find(
    (conversation) => conversation.username === input.result.chat,
  );

  if (!match) {
    return {
      status: "missing",
      conversationId: "",
      chat: input.result.chat,
      localId: input.result.localId,
      message: "未在当前会话列表中找到该语义结果来源。",
    };
  }

  return {
    status: "ready",
    conversationId: match.id,
    chat: input.result.chat,
    localId: input.result.localId,
    message: input.privacyOn
      ? "已打开会话，可在当前聊天中查看上下文。"
      : `已打开 ${match.displayName || "未命名会话"}，可在当前聊天中查看上下文。`,
  };
}
