import { lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Spinner, Typography } from "@l4/ui";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

export function AiWorkspaceView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { chat, currentConversation, workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    privacyOn,
    defaultScope: "currentChat",
  });
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
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={[aiStatusItem(ai.moduleView.kind, ai.qaStatus)]}
      />
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

function aiStatusItem(moduleKind: string, qaStatus: string): WorkspaceScopeStatusItem {
  if (qaStatus === "connecting" || qaStatus === "streaming") {
    return { label: "AI", value: "生成中", tone: "ai", busy: true };
  }
  if (qaStatus === "stopped") return { label: "AI", value: "已停止", tone: "warning" };
  if (qaStatus === "failed") return { label: "AI", value: "问答异常", tone: "danger" };
  if (moduleKind === "checking_config") return { label: "AI", value: "检查配置", tone: "info", busy: true };
  if (moduleKind === "setup_required") return { label: "AI", value: "需要配置", tone: "warning" };
  if (moduleKind === "index_running") return { label: "AI", value: "索引中", tone: "info", busy: true };
  if (moduleKind === "index_paused") return { label: "AI", value: "索引暂停", tone: "warning" };
  if (moduleKind === "failed") return { label: "AI", value: "索引异常", tone: "danger" };
  if (moduleKind === "ready") return { label: "AI", value: "可用", tone: "ai" };
  return { label: "AI", value: "等待索引", tone: "neutral" };
}

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}
