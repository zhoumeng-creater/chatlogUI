import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GraphCanvasProps } from "./GraphCanvas";
import type { GraphModuleView } from "@l2/commander/graphViewModel";
import { GraphVisualizePanel } from "./GraphVisualizePanel";

describe("GraphVisualizePanel", () => {
  it("explains why opening visualization is disabled before graph data is ready", () => {
    const html = renderToStaticMarkup(
      <GraphVisualizePanel
        moduleView={{ ...moduleView, canVisualize: false, message: "Load graph summary to inspect relationships." }}
        loading={false}
        error={null}
        canvasProps={canvasProps}
        onLoadVisualization={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("图谱摘要未加载");
    expect(html).toContain("加载完成后可打开可视化");
  });

  it("explains why opening visualization is disabled while the graph is loading", () => {
    const html = renderToStaticMarkup(
      <GraphVisualizePanel
        moduleView={{ ...moduleView, canVisualize: true }}
        loading
        error={null}
        canvasProps={canvasProps}
        onLoadVisualization={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain("正在打开图谱可视化");
    expect(html).toContain("完成后可继续操作");
  });
});

const moduleView: GraphModuleView = {
  kind: "loaded",
  blocksCoreWorkbench: false,
  canVisualize: true,
  shouldMountCanvas: false,
  message: "Graph summary is loaded.",
  tabs: [],
  tableRows: [],
  groupedSections: [],
  timelineWorkbench: { rows: [] },
  detailInspector: null,
};

const canvasProps: GraphCanvasProps = {
  visible: true,
  loading: false,
  error: null,
  data: null,
  autoRotate: false,
  visibleEntityKinds: [],
  timeWindow: "",
  layoutMode: "force",
  timelineVisible: false,
  highlightedTimelineId: null,
  hoveredNodeId: null,
  selectedNodeId: null,
  pulsedNodeId: null,
  tooltipCoord: null,
  privacyOn: false,
  onRefresh: vi.fn(),
  onNodeHover: vi.fn(),
  onNodeDblClick: vi.fn(),
  onEdgeClick: vi.fn(),
  onVisibleKindsChange: vi.fn(),
  onTimeWindowChange: vi.fn(),
  onLayoutModeChange: vi.fn(),
  onToggleAutoRotate: vi.fn(),
  onTimelineVisibleChange: vi.fn(),
  onHighlightTimelineEntry: vi.fn(),
};
