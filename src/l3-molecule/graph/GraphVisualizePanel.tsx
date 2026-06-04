import { lazy, Suspense } from "react";
import { Network } from "lucide-react";
import { Button, Spinner, Typography } from "@l4/ui";
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
          <Button
            variant="primary"
            size="sm"
            onClick={onLoadVisualization}
            disabled={!moduleView.canVisualize}
            loading={loading}
          >
            <Network size={14} />
            打开可视化
          </Button>
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
