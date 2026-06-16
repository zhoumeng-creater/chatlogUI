import type { Conversation, LoadStatus } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";

export type ChatReadingReason =
  | "no-session-selected"
  | "db-not-ready"
  | "unsupported-account-type"
  | "no-messages"
  | "pagination-exhausted"
  | "backend-error"
  | "timeout"
  | "cancelled"
  | "partial-error"
  | "ready"
  | "loading";

export interface ChatReadingState {
  reason: ChatReadingReason;
  title: string;
  description: string;
  primaryAction: string | null;
  diagnosticFamily: string;
}

interface ChatReadingStateInput {
  conversation: Conversation | undefined;
  messagesStatus: LoadStatus;
  messagesError: string | ApiErrorModel | null;
  messagesHasMore: boolean;
  messagesCount: number;
}

export function buildChatReadingState(input: ChatReadingStateInput): ChatReadingState {
  if (!input.conversation) {
    return {
      reason: "no-session-selected",
      title: "选择会话",
      description: "从左侧会话列表打开聊天记录。",
      primaryAction: "从左侧会话列表打开聊天记录",
      diagnosticFamily: "chat",
    };
  }

  const apiError = toApiError(input.messagesError);
  if (apiError?.cancelled) {
    return {
      reason: "cancelled",
      title: "聊天记录加载已取消",
      description: "已保留当前会话状态，可以重新加载。",
      primaryAction: "重试",
      diagnosticFamily: apiError.diagnosticFamily,
    };
  }

  if (input.messagesCount > 0 && input.messagesError) {
    return {
      reason: "partial-error",
      title: "部分记录暂时无法加载",
      description: messageFromError(input.messagesError, "已有聊天记录会继续保留。"),
      primaryAction: "重试加载",
      diagnosticFamily: apiError?.diagnosticFamily ?? "history",
    };
  }

  if (input.messagesStatus === "loading") {
    return {
      reason: "loading",
      title: "正在加载聊天记录",
      description: "正在读取本机会话历史。",
      primaryAction: null,
      diagnosticFamily: "history",
    };
  }

  if (input.messagesStatus === "error") {
    if (apiError?.category === "db-not-ready") {
      return {
        reason: "db-not-ready",
        title: "数据库尚未准备好",
        description: apiError.message,
        primaryAction: "返回设置中心",
        diagnosticFamily: apiError.diagnosticFamily,
      };
    }

    if (apiError?.category === "timeout") {
      return {
        reason: "timeout",
        title: "聊天记录加载超时",
        description: apiError.message,
        primaryAction: "重试",
        diagnosticFamily: apiError.diagnosticFamily,
      };
    }

    if (apiError?.category === "unsupported-endpoint") {
      return {
        reason: "unsupported-account-type",
        title: "当前接口暂不可用",
        description: apiError.message,
        primaryAction: "检查 sidecar 版本",
        diagnosticFamily: apiError.diagnosticFamily,
      };
    }

    return {
      reason: "backend-error",
      title: "聊天记录加载失败",
      description: messageFromError(input.messagesError, "无法读取该会话的历史消息。"),
      primaryAction: "重试",
      diagnosticFamily: apiError?.diagnosticFamily ?? "history",
    };
  }

  if (input.messagesStatus === "empty" || input.messagesCount === 0) {
    return {
      reason: "no-messages",
      title: "这个会话没有可显示的消息",
      description: "后端没有返回该会话的聊天记录，可以刷新或选择另一个会话。",
      primaryAction: "重试",
      diagnosticFamily: "history",
    };
  }

  if (!input.messagesHasMore) {
    return {
      reason: "pagination-exhausted",
      title: "已到最早消息",
      description: `当前已加载 ${input.messagesCount.toLocaleString()} 条消息。`,
      primaryAction: null,
      diagnosticFamily: "history",
    };
  }

  return {
    reason: "ready",
    title: "聊天记录已加载",
    description: "",
    primaryAction: null,
    diagnosticFamily: "history",
  };
}

function toApiError(error: string | ApiErrorModel | null): ApiErrorModel | null {
  if (!error || typeof error === "string") return null;
  return error;
}

function messageFromError(error: string | ApiErrorModel | null, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return error.message || fallback;
}
