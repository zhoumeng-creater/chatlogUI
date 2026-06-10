import { lazy, Suspense, useEffect } from "react";
import { useGraphCommander, usePrivacyCommander } from "@l2/commander";
import { Spinner, Typography } from "@l4/ui";

const LazyGraphModule = lazy(() =>
  import("@l3/graph/GraphModule").then((module) => ({ default: module.GraphModule })),
);

export function GraphView() {
  const graph = useGraphCommander();
  const privacy = usePrivacyCommander();
  const { openGraph } = graph;

  useEffect(() => {
    void openGraph();
  }, [openGraph]);

  return (
    <div className="workspace-page workspace-page--fill">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h2">图谱</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            图谱是主工作区画布，不再作为聊天 inspector 的特殊模块。
          </Typography>
        </div>
      </header>
      <div className="workspace-page__fill-panel">
        <Suspense fallback={<WorkspaceLoading label="加载图谱模块..." />}>
          <LazyGraphModule graph={graph} privacyOn={privacy.privacyOn} />
        </Suspense>
      </div>
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
