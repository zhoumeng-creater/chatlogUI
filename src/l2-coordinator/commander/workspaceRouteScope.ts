import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import type { WorkspaceScopeField, WorkspaceScopeKind } from "./workspaceScopeModel";

export type WorkspaceScopeMode = "currentChat" | "all";
export type WorkspaceRouteScopeState = "current-chat" | "all" | "missing-chat" | "no-current-chat";

export interface WorkspaceRouteContextChip {
  id: Extract<WorkspaceScopeField, "sourceRoute" | "focusMessage">;
  label: string;
  value: string;
}

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
  scopeKind: WorkspaceScopeKind;
  state: WorkspaceRouteScopeState;
  hasScopedChat: boolean;
  missingChat: boolean;
  currentConversation: Conversation | null;
  currentChat: string;
  scopeLabel: string;
  scopeDescription: string;
  sourceLabel: string | null;
  focusLabel: string | null;
  contextChips: WorkspaceRouteContextChip[];
}

const sourceLabels: Record<string, string> = {
  ai: "来自 AI 证据",
  analytics: "来自统计",
  graph: "来自图谱",
  media: "来自媒体库",
  sns: "来自朋友圈",
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
  const focusLabel = safeFocusLabel(input.focus);
  const contextChips = buildRouteContextChips(sourceLabel, focusLabel);

  if (mode === "all") {
    return {
      mode,
      scopeKind: "allConversations",
      state: "all",
      hasScopedChat,
      missingChat: false,
      currentConversation: null,
      currentChat: "",
      scopeLabel: "全部会话",
      scopeDescription: "正在查看全部会话范围；页面会使用当前模块支持的全局能力。",
      sourceLabel,
      focusLabel,
      contextChips,
    };
  }

  if (hasScopedChat && !scopedConversation) {
    return {
      mode,
      scopeKind: "currentConversation",
      state: "missing-chat",
      hasScopedChat,
      missingChat: true,
      currentConversation: null,
      currentChat: "",
      scopeLabel: "来源会话未找到",
      scopeDescription: "来源会话不可用，请返回会话工作台重新选择。",
      sourceLabel,
      focusLabel,
      contextChips,
    };
  }

  const currentConversation = scopedConversation ?? input.selectedConversation ?? null;
  if (!currentConversation) {
    return {
      mode,
      scopeKind: "currentConversation",
      state: "no-current-chat",
      hasScopedChat,
      missingChat: false,
      currentConversation: null,
      currentChat: "",
      scopeLabel: "未选择会话",
      scopeDescription: "尚未选择会话；从会话工作台进入可加载当前会话范围。",
      sourceLabel,
      focusLabel,
      contextChips,
    };
  }

  return {
    mode,
    scopeKind: "currentConversation",
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
    contextChips,
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

function safeFocusLabel(focus: string | null | undefined): string | null {
  if (!focus?.trim()) return null;
  return "已从上下文进入，可在本页筛选定位对象。";
}

function buildRouteContextChips(
  sourceLabel: string | null,
  focusLabel: string | null,
): WorkspaceRouteContextChip[] {
  const chips: WorkspaceRouteContextChip[] = [];
  if (sourceLabel) {
    chips.push({
      id: "sourceRoute",
      label: "来源",
      value: sourceLabel,
    });
  }
  if (focusLabel) {
    chips.push({
      id: "focusMessage",
      label: "定位",
      value: "上下文定位",
    });
  }
  return chips;
}
