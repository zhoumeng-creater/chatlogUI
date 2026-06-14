import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
  type WorkspaceScopeKind,
} from "@l2/commander/workspaceScopeModel";
import { useMediaCommander } from "@l2/commander/useMediaCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { BusinessExportDialog } from "@l3/export";
import { MediaLibrary } from "@l3/media/MediaLibrary";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Typography } from "@l4/ui";

export function MediaView() {
  const [params, setParams] = useSearchParams();
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
  const scopeController = buildWorkspaceScopeModel({
    moduleId: "media",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
      mediaType: "all",
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
    if (action.field !== "focusMessage" && action.field !== "sourceRoute") return;
    updateScopeParams((next) => {
      if (action.field === "focusMessage") next.delete("focus");
      if (action.field === "sourceRoute") next.delete("source");
    });
  }, [updateScopeParams]);
  const resetScope = useCallback(() => {
    updateScopeParams((next) => {
      next.delete("focus");
      next.delete("source");
    });
  }, [updateScopeParams]);

  useEffect(() => {
    if (currentChat) {
      void loadMediaModule(currentChat, isGroup);
    }
  }, [currentChat, isGroup, loadMediaModule]);

  return (
    <div className="workspace-page media-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">媒体</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            当前阶段聚焦当前会话媒体、收藏、成员、未读和新消息资源。
          </Typography>
        </div>
      </header>
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={[mediaStatusItem(media.status, currentChat)]}
      />
      <WorkspaceScopeController
        model={scopeController}
        onSelectScope={selectScope}
        onClearChip={clearScopeChip}
        onReset={resetScope}
      />
      <div className="workspace-page__surface workspace-page__module-surface">
        <MediaLibrary
          currentChat={currentChat}
          privacyOn={privacyOn}
          attachments={media.attachments}
          favorites={media.favorites}
          members={media.members}
          memberTotal={media.memberTotal}
          unread={media.unread}
          newMessages={media.newMessages}
          status={media.status}
          error={media.error}
          endpointStatus={media.endpointStatus}
          selectedAttachment={media.selectedAttachment}
          previewResourceUrl={media.previewResourceUrl}
          exportAction={media.businessExport.action}
          onRetry={media.retry}
          onPreviewAttachment={media.previewAttachment}
          onClosePreview={media.closePreview}
        />
      </div>
      {media.businessExport.isOpen && <BusinessExportDialog {...media.businessExport.dialog} />}
    </div>
  );
}

function mediaStatusItem(status: string, currentChat: string): WorkspaceScopeStatusItem {
  if (!currentChat) return { label: "媒体", value: "等待范围", tone: "warning" };
  if (status === "loading") return { label: "媒体", value: "加载中", tone: "info", busy: true };
  if (status === "partial") return { label: "媒体", value: "部分可用", tone: "warning" };
  if (status === "error") return { label: "媒体", value: "异常", tone: "danger" };
  if (status === "ready") return { label: "媒体", value: "已加载", tone: "success" };
  if (status === "empty") return { label: "媒体", value: "暂无内容", tone: "neutral" };
  return { label: "媒体", value: "待刷新", tone: "neutral" };
}
