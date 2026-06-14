import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button, Input, Typography } from "@l4/ui";
import { ExportActionButton } from "@l3/export";
import type { useGraphCommander } from "@l2/commander/useGraphCommander";
import { GraphModuleView } from "./GraphModuleView";

const TIME_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "全部", value: "" },
  { label: "近7天", value: "7d" },
  { label: "近30天", value: "30d" },
  { label: "近90天", value: "90d" },
];

type GraphCommander = ReturnType<typeof useGraphCommander>;

interface GraphModuleProps {
  graph: GraphCommander;
  privacyOn: boolean;
}

export function GraphModule({ graph, privacyOn }: GraphModuleProps) {
  const { loadGraphConfig, openGraphModule } = graph;
  const [keywordDraft, setKeywordDraft] = useState(graph.keyword);
  const [entityDraft, setEntityDraft] = useState(graph.entityFilter);
  const [relationDraft, setRelationDraft] = useState(graph.relationFilter);
  const [limitDraft, setLimitDraft] = useState(String(graph.limit));
  const [startDraft, setStartDraft] = useState(graph.start);
  const [endDraft, setEndDraft] = useState(graph.end);

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
      limit,
      start: startDraft || undefined,
      end: endDraft || undefined,
    });
  };

  const setWindow = (window: string) => {
    graph.setGraphFilter({ window });
    void graph.loadGraphSummary({
      keyword: keywordDraft || undefined,
      window: window || undefined,
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
      limit: graph.limit,
      start: startDraft || undefined,
      end: endDraft || undefined,
    });
  };

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
        <ExportActionButton {...graph.businessExport.action} />
        <form
          className="graph-module__filters"
          onSubmit={(event) => {
            event.preventDefault();
            submitFilter();
          }}
        >
          <Input
            variant="search"
            controlSize="sm"
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.currentTarget.value)}
            placeholder="筛选实体或关系"
            aria-label="筛选图谱"
          />
          <Input
            controlSize="sm"
            value={entityDraft}
            onChange={(event) => setEntityDraft(event.currentTarget.value)}
            placeholder="实体"
            aria-label="图谱实体筛选"
          />
          <Input
            controlSize="sm"
            value={relationDraft}
            onChange={(event) => setRelationDraft(event.currentTarget.value)}
            placeholder="关系"
            aria-label="图谱关系筛选"
          />
          <Input
            controlSize="sm"
            type="number"
            min={1}
            max={300}
            value={limitDraft}
            onChange={(event) => setLimitDraft(event.currentTarget.value)}
            aria-label="图谱数量上限"
          />
          <Input
            controlSize="sm"
            type="date"
            value={startDraft}
            onChange={(event) => setStartDraft(event.currentTarget.value)}
            aria-label="图谱开始日期"
          />
          <Input
            controlSize="sm"
            type="date"
            value={endDraft}
            onChange={(event) => setEndDraft(event.currentTarget.value)}
            aria-label="图谱结束日期"
          />
          <Button variant="secondary" size="sm" type="submit" loading={graph.loading}>
            <Search size={14} />
            筛选
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              graph.clearGraphFilters();
              setKeywordDraft("");
              setEntityDraft("");
              setRelationDraft("");
              setLimitDraft("80");
              setStartDraft("");
              setEndDraft("");
              void graph.loadGraphSummary({ limit: 80 });
            }}
          >
            清空
          </Button>
          <div className="graph-module__time-tabs" role="tablist" aria-label="图谱时间范围">
            {TIME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={graph.timeWindow === option.value ? "primary" : "ghost"}
                size="sm"
                onClick={() => setWindow(option.value)}
                role="tab"
                aria-selected={graph.timeWindow === option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </form>
      </div>
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
      />
    </section>
  );
}
