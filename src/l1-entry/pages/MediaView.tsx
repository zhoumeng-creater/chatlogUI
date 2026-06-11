import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMediaCommander } from "@l2/commander/useMediaCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { MediaLibrary } from "@l3/media/MediaLibrary";
import { Typography } from "@l4/ui";

export function MediaView() {
  const [params] = useSearchParams();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  useScopedWorkspaceConversation(params.get("chat"));
  const media = useMediaCommander();
  const { loadMediaModule } = media;
  const currentChat = media.currentConversation?.username ?? "";
  const isGroup = media.currentConversation?.isGroup ?? false;

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
      <div className="workspace-page__surface workspace-page__module-surface">
        <MediaLibrary
          currentChat={currentChat}
          privacyOn={privacyOn}
          attachments={media.attachments}
          favorites={media.favorites}
          members={media.members}
          unread={media.unread}
          newMessages={media.newMessages}
          status={media.status}
          error={media.error}
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
