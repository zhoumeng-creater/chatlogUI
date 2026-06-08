import { lazy, Suspense } from "react";
import { Network } from "lucide-react";
import { Button, DisabledReason, Spinner, Typography } from "@l4/ui";
import type { GraphCanvasProps } from "./GraphCanvas";
import type { GraphModuleView } from "@l2/commander/graphViewModel";

const LazyGraphCanvas = lazy(() =>
  import("./GraphCanvas").then((module) => ({ default: module.GraphCanvas })),
);

interface GraphVisualizePanelProps {
  moduleView: GraphModuleView;
  loading: boolean;
  error: string | null;
  canvasProps: GraphCanvasProps;
  onLoadVisualization: () => void;
  onRetry: () => void;
}

export function GraphVisualizePanel({
  moduleView,
  loading,
  error,
  canvasProps,
  onLoadVisualization,
  onRetry,
}: GraphVisualizePanelProps) {
  const openReason = loading
    ? "正在打开图谱可视化。完成后可继续操作。"
    : !moduleView.canVisualize
      ? "图谱摘要未加载。加载完成后可打开可视化。"
      : undefined;
  const openReasonId = openReason ? "graph-visualize-open-disabled-reason" : undefined;
  const openButton = (
    <Button
      variant="primary"
      size="sm"
      onClick={onLoadVisualization}
      disabled={!moduleView.canVisualize}
      loading={loading}
      aria-describedby={openReasonId}
    >
      <Network size={14} />
      打开可视化
    </Button>
  );

  if (moduleView.shouldMountCanvas) {
    return (
      <div className="graph-visualize-panel graph-visualize-panel--canvas">
        <Suspense
          fallback={
            <div className="graph-visualize-panel__placeholder">
              <Spinner size={18} label="加载可视化视图..." />
            </div>
          }
        >
          <LazyGraphCanvas {...canvasProps} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="graph-visualize-panel">
      <div className="graph-visualize-panel__placeholder">
        <Typography variant="body" weight={700}>
          {moduleView.message}
        </Typography>
        {error && (
          <Typography variant="caption" color="var(--danger)">
            {error}
          </Typography>
        )}
        <div className="graph-visualize-panel__actions">
          {openReason ? (
            <DisabledReason id={openReasonId} reason={openReason} variant="compact">
              {openButton}
            </DisabledReason>
          ) : openButton}
          {(error || moduleView.kind === "error" || moduleView.kind === "failed") && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              重试
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
