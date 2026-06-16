import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
  type WorkspaceScopeKind,
} from "./workspaceScopeModel";
import { useMediaCommander } from "./useMediaCommander";
import { useScopedWorkspaceConversation } from "./useScopedWorkspaceConversation";
import { useChatCommander } from "./useChatCommander";
import type { MediaAttachment } from "@l2/data-clerk/stores/useMediaStore";
import {
  bindActionableEmptyStateActions,
  buildActionableEmptyState,
} from "./actionableEmptyStateModel";

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}

export function useMediaWorkspaceCommander() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const chat = useChatCommander();
  const { workspaceRouteScope, privacyOn } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    defaultScope: "currentChat",
  });
  const media = useMediaCommander();
  const { loadMediaModule } = media;
  const currentConversation = media.currentConversation ?? workspaceRouteScope.currentConversation;
  const currentChat = currentConversation?.username ?? "";
  const isGroup = currentConversation?.isGroup ?? false;
  const hasDateFilter = Boolean(media.filters.dateRange.start || media.filters.dateRange.end);
  const scopeController = buildWorkspaceScopeModel({
    moduleId: "media",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
      mediaType: media.filters.type,
      dateRange: hasDateFilter
        ? {
            preset: "custom",
            start: media.filters.dateRange.start || undefined,
            end: media.filters.dateRange.end || undefined,
          }
        : null,
    },
    pending: media.status === "loading",
  });

  const updateScopeParams = useCallback((update: (next: URLSearchParams) => void) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      update(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const selectScope = useCallback((kind: WorkspaceScopeKind) => {
    if (kind !== "currentConversation" || !currentChat) return;
    updateScopeParams((next) => {
      next.set("scope", "currentChat");
      next.set("chat", currentChat);
    });
  }, [currentChat, updateScopeParams]);

  const clearScopeChip = useCallback((action: WorkspaceScopeClearAction) => {
    if (action.field === "mediaType") {
      media.clearFilter("type");
      return;
    }
    if (action.field === "dateRange") {
      media.clearFilter("dateRange");
      return;
    }
    if (action.field !== "focusMessage" && action.field !== "sourceRoute") return;
    updateScopeParams((next) => {
      if (action.field === "focusMessage") next.delete("focus");
      if (action.field === "sourceRoute") next.delete("source");
    });
  }, [media, updateScopeParams]);

  const resetScope = useCallback(() => {
    media.resetFilters();
    updateScopeParams((next) => {
      next.delete("focus");
      next.delete("source");
    });
  }, [media, updateScopeParams]);

  useEffect(() => {
    if (currentChat) {
      void loadMediaModule(currentChat, isGroup);
    }
  }, [currentChat, isGroup, loadMediaModule]);

  const locateAttachment = useCallback(async (attachment: MediaAttachment) => {
    if (!currentConversation) {
      media.locateAttachment(attachment);
      return;
    }
    if (!attachment.messageId && typeof attachment.localId !== "number") {
      media.locateAttachment(attachment);
      return;
    }

    await chat.selectAndLoadAtAnchor({
      conversationId: currentConversation.id,
      chat: currentConversation.username,
      anchor: {
        source: "media",
        chat: currentConversation.username,
        messageId: attachment.messageId ?? "",
        localId: typeof attachment.localId === "number" ? attachment.localId : null,
        timestamp: attachment.timestamp ?? null,
        time: attachment.time ?? null,
      },
      returnToSearch: {
        returnRoute: withSmokeQuery("/media"),
        activeResultId: attachment.id,
        querySnapshot: {
          query: "media",
          filter: "all",
          scope: "current",
          scopeChat: currentConversation.username,
        },
        sourceConversationId: currentConversation.id,
      },
    });
    navigate(withSmokeQuery("/workbench"));
  }, [chat, currentConversation, media, navigate]);

  return {
    currentChat,
    privacyOn,
    media: {
      ...media,
      locateAttachment,
      emptyStates: {
        noConversation: {
          ...bindActionableEmptyStateActions(buildActionableEmptyState({
            variant: "no-conversation-selected",
            readiness: {
              serviceConfigured: true,
              httpReady: true,
              dbReady: true,
              hasCurrentConversation: false,
            },
            privacyOn,
          }), ["choose-conversation"]),
          description: "打开会话后显示附件、收藏、成员、未读和增量消息。",
        },
      },
    },
    scopeController,
    workspaceRouteScope,
    selectScope,
    clearScopeChip,
    resetScope,
    statusItems: [mediaStatusItem(media.status, currentChat)],
    navigateBackToWorkbench: () => navigate(withSmokeQuery("/workbench")),
  };
}

function mediaStatusItem(status: string, currentChat: string) {
  if (!currentChat) return { label: "媒体", value: "等待范围", tone: "warning" as const };
  if (status === "loading") return { label: "媒体", value: "加载中", tone: "info" as const, busy: true };
  if (status === "partial") return { label: "媒体", value: "部分可用", tone: "warning" as const };
  if (status === "error") return { label: "媒体", value: "异常", tone: "danger" as const };
  if (status === "ready") return { label: "媒体", value: "已加载", tone: "success" as const };
  if (status === "empty") return { label: "媒体", value: "暂无内容", tone: "neutral" as const };
  return { label: "媒体", value: "待刷新", tone: "neutral" as const };
}
