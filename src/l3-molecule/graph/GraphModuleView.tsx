import { GraphGroupedList } from "./GraphGroupedList";
import { GraphDetailInspector } from "./GraphDetailInspector";
import { GraphTimelineWorkbench } from "./GraphTimelineWorkbench";
import { GraphSummaryPanel } from "./GraphSummaryPanel";
import { GraphVisualizePanel } from "./GraphVisualizePanel";
import { GraphAdvancedPanel } from "./GraphAdvancedPanel";
import { GraphWorkbenchTabs } from "./GraphWorkbenchTabs";
import { GraphQAPanel } from "./GraphQAPanel";
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
  GraphStatusSummaryView,
  GraphVisualizeViewState,
} from "./graphTypes";
import type { GraphModuleView as GraphModuleViewModel, GraphWorkbenchTabId } from "@l2/commander/graphViewModel";

interface GraphModuleViewProps {
  moduleView: GraphModuleViewModel;
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
  selectedGraphItemId: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onRebuild: () => void;
  onResetRebuild: () => void;
  onPause: () => void;
  onResume: () => void;
  onActiveTabChange: (tab: GraphWorkbenchTabId) => void;
  onSelectGraphItem: (id: string) => void;
  onUseInspectorFilter: (keyword: string) => void;
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
  selectedGraphItemId,
  onRefresh,
  onRetry,
  onCancel,
  onRebuild,
  onResetRebuild,
  onPause,
  onResume,
  onActiveTabChange,
  onSelectGraphItem,
  onUseInspectorFilter,
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
  const activeTab = moduleView.tabs.find((tab) => tab.active)?.id ?? "overview";
  const handleInspectorAction = (actionId: string) => {
    const inspector = moduleView.detailInspector;
    if (!inspector || privacyOn) return;

    if (actionId === "filter-related") {
      onUseInspectorFilter(inspector.title);
      return;
    }

    if (actionId === "focus-visualization") {
      onActiveTabChange("visualize");
      onLoadVisualization();
      return;
    }

    if (actionId === "graph-qa") {
      onQADraftChange({ query: `请基于知识图谱解释：${inspector.title}` });
      onActiveTabChange("qa");
    }
  };

  const listAndInspector = (
    <div className="graph-workbench-split">
      <GraphGroupedList
        sections={moduleView.groupedSections}
        selectedItemId={selectedGraphItemId}
        privacyOn={privacyOn}
        onSelect={onSelectGraphItem}
      />
      <GraphDetailInspector
        inspector={moduleView.detailInspector}
        privacyOn={privacyOn}
        onAction={handleInspectorAction}
      />
    </div>
  );

  return (
    <div className="graph-module-view">
      <GraphSummaryPanel
        statusSummary={statusSummary}
        visualize={visualize}
        loadStatus={loadStatus}
        loading={loading}
        actionStatus={actionStatus}
        resetRebuildCopy={advancedView.resetRebuildCopy}
        confirmationCopy={advancedView.confirmationCopy}
        onRefresh={onRefresh}
        onRebuild={onRebuild}
        onResetRebuild={onResetRebuild}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        onCancelConfirmation={onCancelAdvancedConfirmation}
      />
      <GraphWorkbenchTabs tabs={moduleView.tabs} onChange={onActiveTabChange} />
      <div className="graph-module-view__content">
        {(activeTab === "overview" || activeTab === "list") && listAndInspector}
        {activeTab === "timeline" && (
          <div className="graph-workbench-split">
            <GraphTimelineWorkbench
              timeline={moduleView.timelineWorkbench}
              selectedItemId={selectedGraphItemId}
              privacyOn={privacyOn}
              onSelect={onSelectGraphItem}
            />
            <GraphDetailInspector
              inspector={moduleView.detailInspector}
              privacyOn={privacyOn}
              onAction={handleInspectorAction}
            />
          </div>
        )}
        {activeTab === "visualize" && (
          <div className="graph-workbench-split">
            <GraphVisualizePanel
              moduleView={moduleView}
              loading={loading}
              error={error}
              canvasProps={canvasProps}
              onLoadVisualization={onLoadVisualization}
              onRetry={onRetry}
            />
            <GraphDetailInspector
              inspector={moduleView.detailInspector}
              privacyOn={privacyOn}
              onAction={handleInspectorAction}
            />
          </div>
        )}
        {activeTab === "qa" && (
          <GraphQAPanel
            view={advancedView}
            draft={qaDraft}
            privacyOn={privacyOn}
            onDraftChange={onQADraftChange}
            onAsk={onGraphQA}
          />
        )}
        {activeTab === "advanced" && (
          <GraphAdvancedPanel
            view={advancedView}
            configDraft={graphConfigDraft}
            businessDraft={businessDraft}
            eventDraft={eventDraft}
            qaDraft={qaDraft}
            privacyOn={privacyOn}
            graphPaused={Boolean(statusSummary?.paused)}
            onLoadConfig={onLoadGraphConfig}
            onSaveConfig={onSaveGraphConfig}
            onRebuild={onRebuild}
            onResetRebuild={onResetRebuild}
            onPause={onPause}
            onResume={onResume}
            onConfigDraftChange={onGraphConfigDraftChange}
            onBusinessDraftChange={onBusinessDraftChange}
            onEventDraftChange={onEventDraftChange}
            onQADraftChange={onQADraftChange}
            onBusinessIngest={onBusinessIngest}
            onEventIngest={onEventIngest}
            onGraphQA={onGraphQA}
            onCancelConfirmation={onCancelAdvancedConfirmation}
          />
        )}
      </div>
    </div>
  );
}
