import { GraphFallbackTable } from "./GraphFallbackTable";
import { GraphSummaryPanel } from "./GraphSummaryPanel";
import { GraphVisualizePanel } from "./GraphVisualizePanel";
import { GraphAdvancedPanel } from "./GraphAdvancedPanel";
import type { GraphCanvasProps } from "./GraphCanvas";
import type {
  GraphBusinessDraft,
  GraphConfigDraft,
  GraphEventDraft,
  GraphQADraft,
  GraphResidualView,
} from "@l2/commander/graphResidualViewModel";
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
  advancedView: GraphResidualView;
  graphConfigDraft: GraphConfigDraft;
  businessDraft: GraphBusinessDraft;
  eventDraft: GraphEventDraft;
  qaDraft: GraphQADraft;
  privacyOn: boolean;
  canvasProps: GraphCanvasProps;
  onRefresh: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onRebuild: () => void;
  onPause: () => void;
  onResume: () => void;
  onLoadVisualization: () => void;
  onLoadGraphConfig: () => void;
  onSaveGraphConfig: () => void;
  onGraphConfigDraftChange: (draft: Partial<GraphConfigDraft>) => void;
  onBusinessDraftChange: (draft: Partial<GraphBusinessDraft>) => void;
  onEventDraftChange: (draft: Partial<GraphEventDraft>) => void;
  onQADraftChange: (draft: Partial<GraphQADraft>) => void;
  onBusinessIngest: () => void;
  onEventIngest: () => void;
  onGraphQA: () => void;
  onCancelAdvancedConfirmation: () => void;
}

export function GraphModuleView({
  moduleView,
  statusSummary,
  visualize,
  loadStatus,
  loading,
  error,
  actionStatus,
  advancedView,
  graphConfigDraft,
  businessDraft,
  eventDraft,
  qaDraft,
  privacyOn,
  canvasProps,
  onRefresh,
  onRetry,
  onCancel,
  onRebuild,
  onPause,
  onResume,
  onLoadVisualization,
  onLoadGraphConfig,
  onSaveGraphConfig,
  onGraphConfigDraftChange,
  onBusinessDraftChange,
  onEventDraftChange,
  onQADraftChange,
  onBusinessIngest,
  onEventIngest,
  onGraphQA,
  onCancelAdvancedConfirmation,
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
      <GraphAdvancedPanel
        view={advancedView}
        configDraft={graphConfigDraft}
        businessDraft={businessDraft}
        eventDraft={eventDraft}
        qaDraft={qaDraft}
        privacyOn={privacyOn}
        onLoadConfig={onLoadGraphConfig}
        onSaveConfig={onSaveGraphConfig}
        onConfigDraftChange={onGraphConfigDraftChange}
        onBusinessDraftChange={onBusinessDraftChange}
        onEventDraftChange={onEventDraftChange}
        onQADraftChange={onQADraftChange}
        onBusinessIngest={onBusinessIngest}
        onEventIngest={onEventIngest}
        onGraphQA={onGraphQA}
        onCancelConfirmation={onCancelAdvancedConfirmation}
      />
    </div>
  );
}
