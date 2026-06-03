import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button, Input, Typography } from "@l4/ui";
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

  useEffect(() => {
    void openGraphModule();
  }, [openGraphModule]);

  useEffect(() => {
    void loadGraphConfig();
  }, [loadGraphConfig]);

  useEffect(() => {
    setKeywordDraft(graph.keyword);
  }, [graph.keyword]);

  const submitFilter = () => {
    graph.setGraphFilter({ keyword: keywordDraft });
    void graph.loadGraphSummary({
      keyword: keywordDraft || undefined,
      window: graph.timeWindow || undefined,
    });
  };

  const setWindow = (window: string) => {
    graph.setGraphFilter({ window });
    void graph.loadGraphSummary({
      keyword: keywordDraft || undefined,
      window: window || undefined,
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
          <Button variant="secondary" size="sm" type="submit" loading={graph.loading}>
            <Search size={14} />
            筛选
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
        onPause={graph.pauseGraph}
        onResume={graph.resumeGraph}
        onLoadVisualization={graph.loadVisualization}
        onLoadGraphConfig={graph.loadGraphConfig}
        onSaveGraphConfig={graph.saveGraphAdvancedConfig}
        onGraphConfigDraftChange={graph.updateGraphConfigDraft}
        onBusinessDraftChange={graph.updateBusinessDraft}
        onEventDraftChange={graph.updateEventDraft}
        onQADraftChange={graph.updateQADraft}
        onBusinessIngest={graph.runBusinessIngest}
        onEventIngest={graph.runEventIngest}
        onGraphQA={graph.runGraphQA}
        onCancelAdvancedConfirmation={graph.cancelAdvancedConfirmation}
      />
    </section>
  );
}
