import { lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Spinner, Typography } from "@l4/ui";

const LazyGraphModule = lazy(() =>
  import("@l3/graph/GraphModule").then((module) => ({ default: module.GraphModule })),
);

export function GraphView() {
  const [params] = useSearchParams();
  const hasContextFocus = Boolean(params.get("focus"));
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { currentConversation, workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: params.get("scope") ?? "all",
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    privacyOn,
    defaultScope: "all",
  });
  const graph = useGraphCommander();
  const { focusOnChat, openGraph } = graph;

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
      <div className="workspace-page__surface workspace-page__module-surface graph-workspace__surface">
        <Suspense fallback={<div className="panel-loading"><Spinner size={20} label="加载图谱..." /></div>}>
          <LazyGraphModule graph={graph} privacyOn={privacyOn} />
        </Suspense>
      </div>
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
