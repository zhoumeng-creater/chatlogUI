import { describe, expect, it } from "vitest";
import type { Conversation, LoadStatus } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { ApiErrorModel } from "@/l2-coordinator/diplomat/errorTranslator";
import { buildChatReadingState } from "./chatReadingState";

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "wxid_synthetic_user",
    username: "wxid_synthetic_user",
    displayName: "Synthetic User",
    chatType: "private",
    isGroup: false,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "session",
    ...overrides,
  };
}

function apiError(category: ApiErrorModel["category"], message: string): ApiErrorModel {
  return {
    category,
    status: category === "timeout" ? "timeout" : "error",
    reason: message,
    message,
    recoveryActions: ["重试当前操作"],
    diagnosticFamily: category,
    retryable: true,
    cancelled: false,
    safeDiagnosticSummary: message,
  };
}

describe("chatReadingState", () => {
  it("explains the no-session state with a concrete next step", () => {
    expect(buildChatReadingState({
      conversation: undefined,
      messagesStatus: "idle",
      messagesError: null,
      messagesHasMore: false,
      messagesCount: 0,
    })).toMatchObject({
      reason: "no-session-selected",
      title: "选择会话",
      primaryAction: "从左侧会话列表打开聊天记录",
    });
  });

  it("distinguishes empty history from pagination exhaustion", () => {
    expect(buildChatReadingState({
      conversation: conversation(),
      messagesStatus: "empty",
      messagesError: null,
      messagesHasMore: false,
      messagesCount: 0,
    })).toMatchObject({
      reason: "no-messages",
      title: "这个会话没有可显示的消息",
    });

    expect(buildChatReadingState({
      conversation: conversation(),
      messagesStatus: "ready" as LoadStatus,
      messagesError: null,
      messagesHasMore: false,
      messagesCount: 5,
    })).toMatchObject({
      reason: "pagination-exhausted",
      title: "已到最早消息",
    });
  });

  it("uses structured API categories for recoverable chat errors", () => {
    expect(buildChatReadingState({
      conversation: conversation(),
      messagesStatus: "error",
      messagesError: apiError("db-not-ready", "数据库尚未准备好"),
      messagesHasMore: false,
      messagesCount: 0,
    })).toMatchObject({
      reason: "db-not-ready",
      title: "数据库尚未准备好",
      primaryAction: "返回设置中心",
    });

    expect(buildChatReadingState({
      conversation: conversation(),
      messagesStatus: "error",
      messagesError: apiError("timeout", "服务响应超时"),
      messagesHasMore: false,
      messagesCount: 0,
    })).toMatchObject({
      reason: "timeout",
      title: "聊天记录加载超时",
      primaryAction: "重试",
    });
  });

  it("keeps existing messages visible when a background load-more fails", () => {
    expect(buildChatReadingState({
      conversation: conversation(),
      messagesStatus: "ready",
      messagesError: "加载更多记录失败",
      messagesHasMore: true,
      messagesCount: 5,
    })).toMatchObject({
      reason: "partial-error",
      title: "部分记录暂时无法加载",
      primaryAction: "重试加载",
    });
  });
});
