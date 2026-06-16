export type GraphControlId =
  | "keyword"
  | "time-window"
  | "refresh"
  | "export"
  | "advanced-filters"
  | "entity"
  | "relation"
  | "limit"
  | "start"
  | "end"
  | "reset"
  | "layout"
  | "auto-rotate"
  | "timeline"
  | "fit-view"
  | "reset-view"
  | "refresh-canvas";

export interface GraphControlItem {
  id: GraphControlId;
  label: string;
  value?: string;
  disabled?: boolean;
  disabledReason?: string | null;
}

export interface GraphControlModelInput {
  keyword: string;
  timeWindow: string;
  entityFilter: string;
  relationFilter: string;
  limit: number;
  start: string;
  end: string;
  loading: boolean;
  canExport: boolean;
  canVisualize: boolean;
  canvasMounted: boolean;
  autoRotate: boolean;
  timelineVisible: boolean;
  layoutMode: "force" | "radial";
}

export interface GraphControlModel {
  primaryControls: GraphControlItem[];
  advancedFilters: GraphControlItem[];
  canvasControls: GraphControlItem[];
  primarySummary: string;
  advancedSummary: string;
}

const TIME_LABELS: Record<string, string> = {
  "": "全部时间",
  "7d": "近 7 天",
  "30d": "近 30 天",
  "90d": "近 90 天",
};

export function buildGraphControlModel(input: GraphControlModelInput): GraphControlModel {
  const exportDisabledReason = input.canExport ? null : "图谱摘要加载完成后可导出。";
  const canvasDisabledReason = input.canvasMounted && input.canVisualize
    ? null
    : "先打开可视化后可使用画布控制。";

  return {
    primaryControls: [
      {
        id: "keyword",
        label: "搜索实体或关系",
        value: input.keyword,
        disabled: input.loading,
        disabledReason: input.loading ? "图谱正在刷新，完成后可继续搜索。" : null,
      },
      {
        id: "time-window",
        label: "时间范围",
        value: timeLabel(input.timeWindow),
        disabled: input.loading,
        disabledReason: input.loading ? "图谱正在刷新，完成后可切换时间范围。" : null,
      },
      {
        id: "refresh",
        label: "刷新摘要",
        disabled: input.loading,
        disabledReason: input.loading ? "图谱正在刷新。" : null,
      },
      {
        id: "export",
        label: "导出",
        disabled: !input.canExport,
        disabledReason: exportDisabledReason,
      },
      {
        id: "advanced-filters",
        label: "更多筛选",
        disabled: input.loading,
        disabledReason: input.loading ? "图谱正在刷新，完成后可调整高级筛选。" : null,
      },
    ],
    advancedFilters: [
      { id: "entity", label: "实体类型", value: input.entityFilter || "全部" },
      { id: "relation", label: "关系类型", value: input.relationFilter || "全部" },
      { id: "limit", label: "数量上限", value: String(input.limit) },
      { id: "start", label: "开始日期", value: input.start || "不限" },
      { id: "end", label: "结束日期", value: input.end || "不限" },
      { id: "reset", label: "重置筛选" },
    ],
    canvasControls: [
      { id: "layout", label: "布局", value: input.layoutMode === "force" ? "力导向" : "径向", disabled: !input.canvasMounted, disabledReason: canvasDisabledReason },
      { id: "auto-rotate", label: "自动旋转", value: input.autoRotate ? "已开启" : "已关闭", disabled: !input.canvasMounted, disabledReason: canvasDisabledReason },
      { id: "timeline", label: "时间线", value: input.timelineVisible ? "已显示" : "已隐藏", disabled: !input.canvasMounted, disabledReason: canvasDisabledReason },
      { id: "fit-view", label: "适配视图", disabled: !input.canvasMounted, disabledReason: canvasDisabledReason },
      { id: "reset-view", label: "重置视图", disabled: !input.canvasMounted, disabledReason: canvasDisabledReason },
      { id: "refresh-canvas", label: "刷新画布", disabled: !input.canvasMounted, disabledReason: canvasDisabledReason },
    ],
    primarySummary: [
      input.keyword ? `关键词 ${input.keyword}` : "未限定关键词",
      `时间 ${timeLabel(input.timeWindow)}`,
    ].join(" · "),
    advancedSummary: [
      `实体类型 ${input.entityFilter || "全部"}`,
      `关系类型 ${input.relationFilter || "全部"}`,
      `上限 ${input.limit}`,
      input.start || input.end ? `${input.start || "不限"} 至 ${input.end || "不限"}` : "不限日期",
    ].join(" · "),
  };
}

export function timeLabel(value: string): string {
  return TIME_LABELS[value] ?? value;
}
