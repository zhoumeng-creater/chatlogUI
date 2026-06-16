import { lazy, Suspense, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
} from "@l2/commander/workspaceScopeModel";
import { buildGraphSourceWorkbenchRoute } from "@l2/commander/graphContextSummaryModel";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { BusinessExportDialog } from "@l3/export";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { Spinner, Typography } from "@l4/ui";

const LazyGraphModule = lazy(() =>
  import("@l3/graph/GraphModule").then((module) => ({ default: module.GraphModule })),
);

export function GraphView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const hasContextFocus = Boolean(params.get("focus"));
  const { currentConversation, workspaceRouteScope, privacyOn } = useScopedWorkspaceConversation({
    scope: params.get("scope") ?? "all",
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    defaultScope: "all",
  });
  const graph = useGraphCommander({
    routeSource: params.get("source"),
    sourceLabel: workspaceRouteScope.sourceLabel,
    focusLabel: workspaceRouteScope.focusLabel,
    scopeLabel: workspaceRouteScope.scopeLabel,
  });
  const { focusOnChat, openGraph } = graph;
  const scopeController = buildWorkspaceScopeModel({
    moduleId: "graph",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
    },
    pending: graph.loading || graph.loadStatus === "loading",
  });

  const updateScopeParams = useCallback((update: (next: URLSearchParams) => void) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      update(next);
      return next;
    }, { replace: true });
  }, [setParams]);

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

  const openSourceInWorkbench = useCallback(() => {
    navigate(buildGraphSourceWorkbenchRoute(params.get("codex-smoke")));
  }, [navigate, params]);

  useEffect(() => {
    void openGraph().then(() => {
      if (!hasContextFocus || !currentConversation) return;
      focusOnChat(currentConversation.displayName || currentConversation.username);
    });
  }, [currentConversation, focusOnChat, hasContextFocus, openGraph]);

  return (
    <div className="workspace-page graph-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">图谱</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            图谱画布、摘要、节点详情和问答在独立主工作区中呈现。
          </Typography>
        </div>
      </header>
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={[graphStatusItem(graph.loading, graph.error, graph.loadStatus)]}
      />
      <WorkspaceScopeController
        model={scopeController}
        onClearChip={clearScopeChip}
        onReset={resetScope}
      />
      <div className="workspace-page__surface workspace-page__module-surface graph-workspace__surface">
        <Suspense fallback={<div className="panel-loading"><Spinner size={20} label="加载图谱..." /></div>}>
          <LazyGraphModule graph={graph} privacyOn={privacyOn} onOpenSource={openSourceInWorkbench} />
        </Suspense>
      </div>
      {graph.businessExport.isOpen && <BusinessExportDialog {...graph.businessExport.dialog} />}
    </div>
  );
}

function graphStatusItem(
  loading: boolean,
  error: string | null,
  loadStatus: string,
): WorkspaceScopeStatusItem {
  if (loading || loadStatus === "loading") return { label: "图谱", value: "加载中", tone: "info", busy: true };
  if (loadStatus === "cancelled") return { label: "图谱", value: "已取消", tone: "warning" };
  if (error || loadStatus === "error" || loadStatus === "malformed" || loadStatus === "oversized") {
    return { label: "图谱", value: "异常", tone: "danger" };
  }
  if (loadStatus === "loaded") return { label: "图谱", value: "已加载", tone: "success" };
  if (loadStatus === "empty") return { label: "图谱", value: "暂无数据", tone: "neutral" };
  return { label: "图谱", value: "待加载", tone: "neutral" };
}
