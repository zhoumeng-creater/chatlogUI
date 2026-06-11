import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMediaCommander } from "@l2/commander/useMediaCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { MediaLibrary } from "@l3/media/MediaLibrary";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Typography } from "@l4/ui";

export function MediaView() {
  const [params] = useSearchParams();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    privacyOn,
    defaultScope: "currentChat",
  });
  const media = useMediaCommander();
  const { loadMediaModule } = media;
  const currentConversation = media.currentConversation ?? workspaceRouteScope.currentConversation;
  const currentChat = currentConversation?.username ?? "";
  const isGroup = currentConversation?.isGroup ?? false;

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
          onRetry={media.retry}
          onPreviewAttachment={media.previewAttachment}
          onClosePreview={media.closePreview}
        />
      </div>
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
