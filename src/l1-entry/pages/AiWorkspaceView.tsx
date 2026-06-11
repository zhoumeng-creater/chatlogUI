import { lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { Spinner, Typography } from "@l4/ui";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

export function AiWorkspaceView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { chat, currentConversation } = useScopedWorkspaceConversation(params.get("chat"));
  const ai = useAiCommander();

  return (
    <div className="workspace-page ai-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">AI</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            语义索引、问答、语义搜索和证据都在这个主工作区完成。
          </Typography>
        </div>
      </header>
      <div className="workspace-page__surface workspace-page__module-surface">
        <Suspense fallback={<div className="panel-loading"><Spinner size={20} label="加载 AI 工作台..." /></div>}>
          <LazyAiPanel
            mode="ai"
            ai={ai}
            currentChat={currentConversation?.username ?? ""}
            currentContact={currentConversation?.displayName ?? ""}
            privacyOn={privacyOn}
            onSelectAndLoad={(conversationId, chatName) => {
              void chat.selectAndLoad(conversationId, chatName).then(() => navigate(withSmokeQuery("/workbench")));
            }}
            onModeChange={(mode) => {
              if (mode === "stats") navigate(withSmokeQuery("/analytics"));
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}
