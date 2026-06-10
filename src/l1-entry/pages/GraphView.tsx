import { lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useGraphCommander } from "@l2/commander/useGraphCommander";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { Spinner, Typography } from "@l4/ui";

const LazyGraphModule = lazy(() =>
  import("@l3/graph/GraphModule").then((module) => ({ default: module.GraphModule })),
);

export function GraphView() {
  const [params] = useSearchParams();
  useScopedWorkspaceConversation(params.get("chat"));
  const graph = useGraphCommander();
  const { openGraph } = graph;
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  useEffect(() => {
    void openGraph();
  }, [openGraph]);

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
      <div className="workspace-page__surface workspace-page__module-surface graph-workspace__surface">
        <Suspense fallback={<div className="panel-loading"><Spinner size={20} label="加载图谱..." /></div>}>
          <LazyGraphModule graph={graph} privacyOn={privacyOn} />
        </Suspense>
      </div>
    </div>
  );
}
