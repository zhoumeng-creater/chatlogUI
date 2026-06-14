import { useEffect, useState } from "react";
import { Typography } from "@l4/ui";
import type { useGraphCommander } from "@l2/commander/useGraphCommander";
import { GraphModuleView } from "./GraphModuleView";
import { GraphAdvancedFilterDrawer } from "./GraphAdvancedFilterDrawer";
import { GraphPrimaryControls } from "./GraphPrimaryControls";

type GraphCommander = ReturnType<typeof useGraphCommander>;

interface GraphModuleProps {
  graph: GraphCommander;
  privacyOn: boolean;
  onOpenSource: () => void;
}

export function GraphModule({ graph, privacyOn, onOpenSource }: GraphModuleProps) {
  const { loadGraphConfig, openGraphModule } = graph;
  const [keywordDraft, setKeywordDraft] = useState(graph.keyword);
  const [entityDraft, setEntityDraft] = useState(graph.entityFilter);
  const [relationDraft, setRelationDraft] = useState(graph.relationFilter);
  const [limitDraft, setLimitDraft] = useState(String(graph.limit));
  const [startDraft, setStartDraft] = useState(graph.start);
  const [endDraft, setEndDraft] = useState(graph.end);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  useEffect(() => {
    void openGraphModule();
  }, [openGraphModule]);

  useEffect(() => {
    void loadGraphConfig();
  }, [loadGraphConfig]);

  useEffect(() => {
    setKeywordDraft(graph.keyword);
    setEntityDraft(graph.entityFilter);
    setRelationDraft(graph.relationFilter);
    setLimitDraft(String(graph.limit));
    setStartDraft(graph.start);
    setEndDraft(graph.end);
  }, [graph.keyword, graph.entityFilter, graph.relationFilter, graph.limit, graph.start, graph.end]);

  const submitFilter = () => {
    const nextLimit = Number(limitDraft);
    const limit = Number.isFinite(nextLimit) && nextLimit > 0 ? nextLimit : graph.limit;
    graph.setGraphFilter({
      keyword: keywordDraft,
      entity: entityDraft,
      relation: relationDraft,
      limit,
      start: startDraft,
      end: endDraft,
    });
    void graph.loadGraphSummary({
      keyword: keywordDraft || undefined,
      window: graph.timeWindow || undefined,
      entity: entityDraft || undefined,
      relation: relationDraft || undefined,
      limit,
      start: startDraft || undefined,
      end: endDraft || undefined,
    });
    setAdvancedFiltersOpen(false);
  };

  const setWindow = (window: string) => {
    graph.setGraphFilter({ window });
    void graph.loadGraphSummary({
      keyword: keywordDraft || undefined,
      window: window || undefined,
      entity: entityDraft || undefined,
      relation: relationDraft || undefined,
      limit: graph.limit,
      start: startDraft || undefined,
      end: endDraft || undefined,
    });
  };

  const useInspectorFilter = (keyword: string) => {
    setKeywordDraft(keyword);
    graph.setGraphFilter({ keyword });
    void graph.loadGraphSummary({
      keyword,
      window: graph.timeWindow || undefined,
      entity: entityDraft || undefined,
      relation: relationDraft || undefined,
      limit: graph.limit,
      start: startDraft || undefined,
      end: endDraft || undefined,
    });
  };

  const resetAdvancedFilters = () => {
    graph.clearGraphFilters();
    setKeywordDraft("");
    setEntityDraft("");
    setRelationDraft("");
    setLimitDraft("80");
    setStartDraft("");
    setEndDraft("");
    setAdvancedFiltersOpen(false);
    void graph.loadGraphSummary({ limit: 80 });
  };

  const hasUnappliedChanges =
    graph.keyword !== keywordDraft ||
    graph.entityFilter !== entityDraft ||
    graph.relationFilter !== relationDraft ||
    String(graph.limit) !== limitDraft ||
    graph.start !== startDraft ||
    graph.end !== endDraft;

  return (
    <section className="graph-module" aria-label="知识图谱模块">
      <div className="graph-module__header">
        <div>
          <Typography variant="label" weight={700}>
            知识图谱
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {graph.visualize
              ? `${graph.visualize.summary.nodeCount} 实体 · ${graph.visualize.summary.edgeCount} 关系`
            : "图谱摘要"}
          </Typography>
        </div>
      </div>
      <GraphPrimaryControls
        model={graph.controlModel}
        keywordDraft={keywordDraft}
        onKeywordDraftChange={setKeywordDraft}
        onSubmit={submitFilter}
        onTimeWindowChange={setWindow}
        onRefresh={graph.refreshGraph}
        onOpenAdvancedFilters={() => setAdvancedFiltersOpen(true)}
        exportAction={graph.businessExport.action}
      />
      <GraphAdvancedFilterDrawer
        open={advancedFiltersOpen}
        model={graph.controlModel}
        entityDraft={entityDraft}
        relationDraft={relationDraft}
        limitDraft={limitDraft}
        startDraft={startDraft}
        endDraft={endDraft}
        hasUnappliedChanges={hasUnappliedChanges}
        onEntityDraftChange={setEntityDraft}
        onRelationDraftChange={setRelationDraft}
        onLimitDraftChange={setLimitDraft}
        onStartDraftChange={setStartDraft}
        onEndDraftChange={setEndDraft}
        onApply={submitFilter}
        onReset={resetAdvancedFilters}
        onClose={() => setAdvancedFiltersOpen(false)}
      />
      <GraphModuleView
        moduleView={graph.moduleView}
        statusSummary={graph.statusSummary}
        visualize={graph.visualize}
        loadStatus={graph.loadStatus}
        loading={graph.loading}
        error={graph.error}
        actionStatus={graph.actionStatus}
        advancedView={graph.advancedView}
        graphConfigDraft={graph.graphConfigDraft}
        businessDraft={graph.businessDraft}
        eventDraft={graph.eventDraft}
        qaDraft={graph.qaDraft}
        privacyOn={privacyOn}
        canvasProps={{
          visible: graph.visible,
          loading: graph.loading,
          error: graph.error,
          data: graph.data,
          autoRotate: graph.autoRotate,
          visibleEntityKinds: graph.visibleEntityKinds,
          timeWindow: graph.timeWindow,
          layoutMode: graph.layoutMode,
          timelineVisible: graph.timelineVisible,
          highlightedTimelineId: graph.highlightedTimelineId,
          hoveredNodeId: graph.hoveredNodeId,
          selectedNodeId: graph.selectedNodeId,
          pulsedNodeId: graph.pulsedNodeId,
          tooltipCoord: graph.tooltipCoord,
          privacyOn,
          onRefresh: graph.refreshGraph,
          onNodeHover: graph.hoverNode,
          onNodeDblClick: graph.selectNode,
          onEdgeClick: graph.selectEdge,
          onVisibleKindsChange: graph.setVisibleKinds,
          onTimeWindowChange: setWindow,
          onLayoutModeChange: graph.setLayoutMode,
          onToggleAutoRotate: graph.toggleAutoRotate,
          onTimelineVisibleChange: graph.setTimelineVisible,
          onHighlightTimelineEntry: graph.highlightTimelineEntry,
        }}
        onRefresh={graph.refreshGraph}
        onRetry={graph.retryGraphLoad}
        onCancel={graph.cancelGraphLoad}
        onRebuild={graph.rebuildGraph}
        onResetRebuild={graph.resetRebuildGraph}
        onPause={graph.pauseGraph}
        onResume={graph.resumeGraph}
        onActiveTabChange={graph.setActiveTab}
        onSelectGraphItem={graph.selectGraphItem}
        onUseInspectorFilter={useInspectorFilter}
        onOpenSource={onOpenSource}
        onLoadVisualization={graph.loadVisualization}
        onLoadGraphConfig={graph.loadGraphConfig}
        onSaveGraphConfig={() => graph.saveGraphAdvancedConfig()}
        onGraphConfigDraftChange={graph.updateGraphConfigDraft}
        onBusinessDraftChange={graph.updateBusinessDraft}
        onEventDraftChange={graph.updateEventDraft}
        onQADraftChange={graph.updateQADraft}
        onBusinessIngest={() => graph.runBusinessIngest()}
        onEventIngest={() => graph.runEventIngest()}
        onGraphQA={() => graph.runGraphQA()}
        onCancelAdvancedConfirmation={graph.cancelAdvancedConfirmation}
        selectedGraphItemId={graph.selectedGraphItemId}
        contextSummary={graph.contextSummary}
      />
    </section>
  );
}
