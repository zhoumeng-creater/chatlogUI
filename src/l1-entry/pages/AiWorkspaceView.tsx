import { lazy, Suspense, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
  type WorkspaceScopeKind,
} from "@l2/commander/workspaceScopeModel";
import { buildAiEvidenceNavigationTarget } from "@l2/commander/semanticDiscoveryNavigation";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { BusinessExportDialog } from "@l3/export";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Spinner, Typography } from "@l4/ui";

const LazyAiPanel = lazy(() =>
  import("@l3/semantic/AiPanel").then((module) => ({ default: module.AiPanel })),
);

export function AiWorkspaceView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { chat, currentConversation, workspaceRouteScope, privacyOn } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    defaultScope: "currentChat",
  });
  const ai = useAiCommander();
  const currentChat = currentConversation?.username ?? "";
  const scopeController = buildWorkspaceScopeModel({
    moduleId: "ai",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
    },
    pending: ai.qaStatus === "connecting" || ai.qaStatus === "streaming",
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
      <WorkspaceScopeController
        model={scopeController}
        onSelectScope={selectScope}
        onClearChip={clearScopeChip}
        onReset={resetScope}
      />
      <div className="workspace-page__surface workspace-page__module-surface">
        <Suspense fallback={<div className="panel-loading"><Spinner size={20} label="加载 AI 工作台..." /></div>}>
          <LazyAiPanel
            ai={ai}
            openSetupOnMount={params.get("panel") === "semantic"}
            currentChat={currentChat}
            currentContact={currentConversation?.displayName ?? ""}
            privacyOn={privacyOn}
            onSelectEvidenceSource={(sourceChat, _label, localId) => {
              const conversation = chat.conversations.find((item) =>
                item.username === sourceChat || item.id === sourceChat,
              );
              if (!conversation) return;

              void chat.selectAndLoadAtAnchor(buildAiEvidenceNavigationTarget({
                conversationId: conversation.id,
                chat: conversation.username,
                localId,
                returnRoute: withSmokeQuery("/ai"),
                activeResultId: localId && localId > 0 ? `ai-evidence-${localId}` : `ai-evidence-${conversation.id}`,
                query: "AI 证据",
              })).then(() => navigate(withSmokeQuery("/workbench")));
            }}
          />
        </Suspense>
      </div>
      {ai.businessExport.isOpen && <BusinessExportDialog {...ai.businessExport.dialog} />}
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
