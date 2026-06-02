import { GraphFallbackTable } from "./GraphFallbackTable";
import { GraphSummaryPanel } from "./GraphSummaryPanel";
import { GraphVisualizePanel } from "./GraphVisualizePanel";
import type { GraphCanvasProps } from "./GraphCanvas";
import type {
  GraphActionResultView,
  GraphLoadStatusView,
  GraphModuleViewState,
  GraphStatusSummaryView,
  GraphVisualizeViewState,
} from "./graphTypes";

interface GraphModuleViewProps {
  moduleView: GraphModuleViewState;
  statusSummary: GraphStatusSummaryView | null;
  visualize: GraphVisualizeViewState | null;
  loadStatus: GraphLoadStatusView;
  loading: boolean;
  error: string | null;
  actionStatus: GraphActionResultView | null;
  privacyOn: boolean;
  canvasProps: GraphCanvasProps;
  onRefresh: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onRebuild: () => void;
  onPause: () => void;
  onResume: () => void;
  onLoadVisualization: () => void;
}

export function GraphModuleView({
  moduleView,
  statusSummary,
  visualize,
  loadStatus,
  loading,
  error,
  actionStatus,
  privacyOn,
  canvasProps,
  onRefresh,
  onRetry,
  onCancel,
  onRebuild,
  onPause,
  onResume,
  onLoadVisualization,
}: GraphModuleViewProps) {
  return (
    <div className="graph-module-view">
      <GraphSummaryPanel
        statusSummary={statusSummary}
        visualize={visualize}
        loadStatus={loadStatus}
        loading={loading}
        actionStatus={actionStatus}
        onRefresh={onRefresh}
        onRebuild={onRebuild}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
      />
      <div className="graph-module-view__content">
        <GraphFallbackTable rows={moduleView.tableRows} privacyOn={privacyOn} />
        <GraphVisualizePanel
          moduleView={moduleView}
          loading={loading}
          error={error}
          canvasProps={canvasProps}
          onLoadVisualization={onLoadVisualization}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}
