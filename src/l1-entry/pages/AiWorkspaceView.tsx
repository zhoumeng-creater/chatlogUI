import { lazy, Suspense } from "react";
import { useAiCommander, useChatCommander, usePrivacyCommander } from "@l2/commander";
import { isWorkbenchReadySmokeSearch } from "@l2/commander/workbenchInformationArchitecture";
import { Spinner, Typography } from "@l4/ui";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

export function AiWorkspaceView() {
  const ai = useAiCommander();
  const chat = useChatCommander();
  const privacy = usePrivacyCommander();
  const showLightweightSmokeContent =
    import.meta.env.DEV
    && typeof window !== "undefined"
    && isWorkbenchReadySmokeSearch(window.location.search);
  const { conversations, selectAndLoad, selectedConversationId } = chat;
  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  return (
    <div className="workspace-page workspace-page--fill">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h2">AI</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            AI 问答、语义搜索和索引状态位于独立工作台；聊天页只保留上下文入口。
          </Typography>
        </div>
      </header>
      <div className="workspace-page__fill-panel">
        {showLightweightSmokeContent ? (
          <SmokeAiPanel />
        ) : (
          <Suspense fallback={<WorkspaceLoading label="加载 AI 工作台..." />}>
            <LazyAiPanel
              mode="ai"
              ai={ai}
              currentChat={currentConversation?.username ?? ""}
              currentContact={currentConversation?.displayName ?? ""}
              privacyOn={privacy.privacyOn}
              onSelectAndLoad={(conversationId, chatId) => {
                void selectAndLoad(conversationId, chatId);
              }}
              onModeChange={() => undefined}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function SmokeAiPanel() {
  return (
    <div className="panel-loading" aria-label="AI smoke state">
      <Typography variant="body" color="var(--text-secondary)">
        AI 工作台导航已就绪。
      </Typography>
    </div>
  );
}

function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div className="panel-loading">
      <Spinner size={20} label={label} color="var(--text-muted)" />
    </div>
  );
}
