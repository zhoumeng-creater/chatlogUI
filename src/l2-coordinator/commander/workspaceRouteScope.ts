import type { Conversation } from "@l2/data-clerk/stores/useChatStore";

export type WorkspaceScopeMode = "currentChat" | "all";
export type WorkspaceRouteScopeState = "current-chat" | "all" | "missing-chat" | "no-current-chat";

export interface WorkspaceRouteScopeInput {
  scope?: string | null;
  scopedChat?: string | null;
  focus?: string | null;
  source?: string | null;
  conversations: Conversation[];
  selectedConversation?: Conversation | null;
  privacyOn: boolean;
  defaultScope?: WorkspaceScopeMode;
}

export interface WorkspaceRouteScopeView {
  mode: WorkspaceScopeMode;
  state: WorkspaceRouteScopeState;
  hasScopedChat: boolean;
  missingChat: boolean;
  currentConversation: Conversation | null;
  currentChat: string;
  scopeLabel: string;
  scopeDescription: string;
  sourceLabel: string | null;
  focusLabel: string | null;
}

const sourceLabels: Record<string, string> = {
  workbench: "来自会话工作台",
  inspector: "来自会话详情",
  search: "来自搜索结果",
  rail: "来自主导航",
};

export function findConversationForScopedChat(
  conversations: Conversation[],
  scopedChat: string | null | undefined,
): Conversation | null {
  const target = scopedChat?.trim();
  if (!target) return null;
  return conversations.find((conversation) =>
    conversation.username === target || conversation.id === target,
  ) ?? null;
}

export function buildWorkspaceRouteScopeView(input: WorkspaceRouteScopeInput): WorkspaceRouteScopeView {
  const scopedChat = input.scopedChat?.trim() ?? "";
  const hasScopedChat = scopedChat.length > 0;
  const mode = normalizeScope(input.scope, hasScopedChat, input.defaultScope ?? "currentChat");
  const scopedConversation = findConversationForScopedChat(input.conversations, scopedChat);
  const sourceLabel = safeSourceLabel(input.source);
  const focusLabel = safeFocusLabel(input.focus, input.privacyOn);

  if (mode === "all") {
    return {
      mode,
      state: "all",
      hasScopedChat,
      missingChat: false,
      currentConversation: null,
      currentChat: "",
      scopeLabel: "全部会话",
      scopeDescription: "正在查看全部会话范围；页面会使用当前模块支持的全局能力。",
      sourceLabel,
      focusLabel,
    };
  }

  if (hasScopedChat && !scopedConversation) {
    return {
      mode,
      state: "missing-chat",
      hasScopedChat,
      missingChat: true,
      currentConversation: null,
      currentChat: "",
      scopeLabel: "来源会话未找到",
      scopeDescription: "来源会话不可用，请返回会话工作台重新选择。",
      sourceLabel,
      focusLabel,
    };
  }

  const currentConversation = scopedConversation ?? input.selectedConversation ?? null;
  if (!currentConversation) {
    return {
      mode,
      state: "no-current-chat",
      hasScopedChat,
      missingChat: false,
      currentConversation: null,
      currentChat: "",
      scopeLabel: "未选择会话",
      scopeDescription: "尚未选择会话；从会话工作台进入可加载当前会话范围。",
      sourceLabel,
      focusLabel,
    };
  }

  return {
    mode,
    state: "current-chat",
    hasScopedChat,
    missingChat: false,
    currentConversation,
    currentChat: currentConversation.username,
    scopeLabel: formatCurrentChatScopeLabel(currentConversation, input.privacyOn),
    scopeDescription: hasScopedChat
      ? "正在查看由上下文入口带入的当前会话范围。"
      : "正在查看当前选中的会话范围。",
    sourceLabel,
    focusLabel,
  };
}

function normalizeScope(
  scope: string | null | undefined,
  hasScopedChat: boolean,
  defaultScope: WorkspaceScopeMode,
): WorkspaceScopeMode {
  if (scope === "all") return "all";
  if (scope === "currentChat") return "currentChat";
  if (hasScopedChat) return "currentChat";
  return defaultScope;
}

function formatCurrentChatScopeLabel(conversation: Conversation, privacyOn: boolean): string {
  if (privacyOn) return "当前会话（已隐藏）";
  const displayName = conversation.displayName.trim() || conversation.username || "未命名会话";
  return `当前会话：${displayName}`;
}

function safeSourceLabel(source: string | null | undefined): string | null {
  const normalized = source?.trim().toLowerCase();
  if (!normalized) return null;
  return sourceLabels[normalized] ?? "来自上下文入口";
}

function safeFocusLabel(focus: string | null | undefined, privacyOn: boolean): string | null {
  if (!focus?.trim()) return null;
  return privacyOn ? "已带入隐私保护焦点" : "已带入上下文焦点";
}
