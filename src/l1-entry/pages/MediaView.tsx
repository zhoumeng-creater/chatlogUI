import { useEffect } from "react";
import { useChatCommander, useMediaCommander, usePrivacyCommander } from "@l2/commander";
import { MediaLibrary } from "@l3/media/MediaLibrary";
import { Typography } from "@l4/ui";

export function MediaView() {
  const chat = useChatCommander();
  const media = useMediaCommander();
  const privacy = usePrivacyCommander();
  const { conversations, selectedConversationId } = chat;
  const { loadMediaModule } = media;
  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const currentChat = currentConversation?.username ?? "";

  useEffect(() => {
    if (currentChat) {
      void loadMediaModule(currentChat, currentConversation?.isGroup ?? false);
    }
  }, [currentChat, currentConversation?.isGroup, loadMediaModule]);

  return (
    <div className="workspace-page workspace-page--fill">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h2">媒体</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            媒体库已迁出聊天 inspector；当前版本先展示当前会话媒体和扩展摘要。
          </Typography>
        </div>
      </header>
      <div className="workspace-page__fill-panel">
        <MediaLibrary
          currentChat={currentChat}
          privacyOn={privacy.privacyOn}
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
