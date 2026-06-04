import type {
  GraphLoadStatus,
  GraphQueryView,
  GraphStatusView,
  GraphTimelineView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";
import { maskDiagnosticText } from "@/utils/maskSecrets";

export type GraphWorkbenchTabId = "overview" | "list" | "timeline" | "visualize" | "qa" | "advanced";

export interface GraphModuleViewInput {
  statusSummary: GraphStatusView | null;
  visualize: GraphVisualizeView | null;
  query?: GraphQueryView | null;
  timeline?: GraphTimelineView | null;
  visualizationRequested: boolean;
  activeTab?: GraphWorkbenchTabId;
  selectedItemId?: string | null;
}

export interface GraphModuleTableRow {
  id: string;
  type: "node" | "edge" | "timeline";
  label: string;
  detail: string;
}

export interface GraphModuleView {
  kind: GraphLoadStatus | "unavailable" | "failed";
  blocksCoreWorkbench: boolean;
  canVisualize: boolean;
  shouldMountCanvas: boolean;
  message: string;
  tabs: GraphWorkbenchTab[];
  statusSummary?: GraphModuleStatusSummary;
  tableRows: GraphModuleTableRow[];
  groupedSections: GraphWorkbenchSection[];
  timelineWorkbench: GraphTimelineWorkbench;
  detailInspector: GraphDetailInspector | null;
}

export interface GraphModuleStatusSummary {
  queueLabel: string;
  workerLabel: string;
  etaLabel: string;
  rateLabel: string;
}

export interface GraphWorkbenchTab {
  id: GraphWorkbenchTabId;
  label: string;
  active: boolean;
}

export interface GraphWorkbenchSection {
  id: "entities" | "relations" | "events" | "facts";
  label: string;
  count: number;
  rows: GraphWorkbenchRow[];
}

export interface GraphWorkbenchRow {
  id: string;
  kind: "entity" | "relation" | "event" | "fact" | "timeline";
  label: string;
  detail: string;
  meta: string[];
  detailRows: Array<{ label: string; value: string }>;
}

export interface GraphTimelineWorkbench {
  rows: GraphWorkbenchRow[];
}

export interface GraphDetailInspector {
  id: string;
  kind: GraphWorkbenchRow["kind"];
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string }>;
  actions: Array<{ id: string; label: string; enabled: boolean }>;
}

export interface GraphCanvasSelectionInput {
  kind: "node" | "edge";
  id: string;
  label?: string;
  sourceLabel?: string;
  targetLabel?: string;
  query?: GraphQueryView | null;
}

export function deriveGraphModuleView(input: GraphModuleViewInput): GraphModuleView {
  const groupedSections = graphGroupedSections(input.query ?? null);
  const timelineWorkbench = graphTimelineWorkbench(input.timeline ?? null);
  const tableRows = groupedSections.some((section) => section.rows.length > 0)
    ? groupedTableRows(groupedSections)
    : input.visualize
      ? graphTableRows(input.visualize)
      : [];
  const detailInspector = selectedDetailInspector(
    [...groupedSections.flatMap((section) => section.rows), ...timelineWorkbench.rows],
    input.selectedItemId ?? null,
  );

  if (input.statusSummary?.state === "unavailable") {
    return {
      ...baseView("unavailable", "Graph service is unavailable.", input.statusSummary, input.activeTab),
      groupedSections,
      timelineWorkbench,
      detailInspector,
    };
  }

  if (input.statusSummary?.state === "error") {
    return {
      ...baseView("failed", safeMessage(input.statusSummary.lastError || "Graph service failed."), input.statusSummary, input.activeTab),
      groupedSections,
      timelineWorkbench,
      detailInspector,
    };
  }

  if (!input.visualize) {
    return {
      ...baseView(input.statusSummary?.state === "running" ? "loading" : "idle", "Load graph summary to inspect relationships.", null, input.activeTab),
      statusSummary: graphStatusSummary(input.statusSummary),
      canVisualize: false,
      tableRows,
      groupedSections,
      timelineWorkbench,
      detailInspector,
    };
  }

  if (input.visualize.state !== "loaded") {
    return {
      ...baseView(input.visualize.state, safeMessage(input.visualize.error || graphStateMessage(input.visualize.state)), input.statusSummary, input.activeTab),
      tableRows,
      groupedSections,
      timelineWorkbench,
      detailInspector,
    };
  }

  return {
    kind: "loaded",
    blocksCoreWorkbench: false,
    canVisualize: true,
    shouldMountCanvas: input.visualizationRequested,
    message: "Graph summary is loaded.",
    tabs: graphTabs(input.activeTab),
    statusSummary: graphStatusSummary(input.statusSummary),
    tableRows,
    groupedSections,
    timelineWorkbench,
    detailInspector,
  };
}

export function resolveGraphWorkbenchItemIdFromCanvas(
  input: GraphCanvasSelectionInput,
): string | null {
  const query = input.query;
  if (!query) return null;

  if (input.kind === "node") {
    const matchedEntity = query.entities.find((entity) =>
      entity.id === input.id || (input.label ? entity.label === input.label : false)
    );
    if (matchedEntity) return `entity-${matchedEntity.id}`;
    return query.entities.length === 1 ? `entity-${query.entities[0].id}` : null;
  }

  const matchedRelation = query.relations.find((relation) => relation.id === input.id)
    ?? query.relations.find((relation) => {
      const labelMatches = input.label
        ? relation.label === input.label || relation.predicate === input.label
        : false;
      const sourceMatches = input.sourceLabel ? relation.subject === input.sourceLabel : true;
      const targetMatches = input.targetLabel ? relation.object === input.targetLabel : true;
      return labelMatches && sourceMatches && targetMatches;
    });

  if (matchedRelation) return `relation-${matchedRelation.id}`;
  return query.relations.length === 1 ? `relation-${query.relations[0].id}` : null;
}

function baseView(
  kind: GraphModuleView["kind"],
  message: string,
  statusSummary?: GraphStatusView | null,
  activeTab?: GraphWorkbenchTabId,
): GraphModuleView {
  return {
    kind,
    blocksCoreWorkbench: false,
    canVisualize: false,
    shouldMountCanvas: false,
    message,
    tabs: graphTabs(activeTab),
    statusSummary: graphStatusSummary(statusSummary ?? null),
    tableRows: [],
    groupedSections: graphGroupedSections(null),
    timelineWorkbench: { rows: [] },
    detailInspector: null,
  };
}

function graphTableRows(visualize: GraphVisualizeView): GraphModuleTableRow[] {
  return [
    ...visualize.nodes.map((node) => ({
      id: `node-${node.id}`,
      type: "node" as const,
      label: node.label,
      detail: node.kind,
    })),
    ...visualize.edges.map((edge) => ({
      id: `edge-${edge.id}`,
      type: "edge" as const,
      label: edge.label,
      detail: `${edge.source} -> ${edge.target}`,
    })),
    ...visualize.timelineRows.map((row, index) => ({
      id: `timeline-${index}`,
      type: "timeline" as const,
      label: row.title,
      detail: row.source || row.description,
    })),
  ];
}

function graphGroupedSections(query: GraphQueryView | null): GraphWorkbenchSection[] {
  return [
    {
      id: "entities",
      label: "实体",
      count: query?.entities.length ?? 0,
      rows: query?.entities.map((entity) => ({
        id: `entity-${entity.id}`,
        kind: "entity" as const,
        label: entity.label,
        detail: entity.type,
        meta: [`提及 ${entity.mentions}`],
        detailRows: entity.detailRows,
      })) ?? [],
    },
    {
      id: "relations",
      label: "关系",
      count: query?.relations.length ?? 0,
      rows: query?.relations.map((relation) => ({
        id: `relation-${relation.id}`,
        kind: "relation" as const,
        label: relation.label,
        detail: relation.label,
        meta: compactMeta([relation.status, relation.verifiedLabel, `证据 ${relation.evidenceCount}`]),
        detailRows: relation.detailRows,
      })) ?? [],
    },
    {
      id: "events",
      label: "事件",
      count: query?.events.length ?? 0,
      rows: query?.events.map((event) => ({
        id: `event-${event.id}`,
        kind: "event" as const,
        label: event.label,
        detail: event.timeLabel,
        meta: compactMeta([event.type, event.sourceLabel]),
        detailRows: event.detailRows,
      })) ?? [],
    },
    {
      id: "facts",
      label: "事实",
      count: query?.facts.length ?? 0,
      rows: query?.facts.map((fact) => ({
        id: `fact-${fact.id}`,
        kind: "fact" as const,
        label: fact.label,
        detail: fact.changeType || fact.status,
        meta: compactMeta([fact.status, fact.verifiedLabel, `证据 ${fact.evidenceCount}`]),
        detailRows: fact.detailRows,
      })) ?? [],
    },
  ];
}

function graphTimelineWorkbench(timeline: GraphTimelineView | null): GraphTimelineWorkbench {
  return {
    rows: timeline?.rows.map((row, index) => ({
      id: `timeline-${index}`,
      kind: "timeline" as const,
      label: row.title,
      detail: formatUnixSeconds(row.time),
      meta: compactMeta([row.type, row.source]),
      detailRows: compactDetailRows([
        { label: "时间", value: formatUnixSeconds(row.time) },
        { label: "类型", value: row.type },
        { label: "描述", value: row.description },
        { label: "来源", value: row.source },
      ]),
    })) ?? [],
  };
}

function selectedDetailInspector(
  rows: GraphWorkbenchRow[],
  selectedItemId: string | null,
): GraphDetailInspector | null {
  if (!selectedItemId) return null;
  const selected = rows.find((row) => row.id === selectedItemId);
  if (!selected) return null;
  return {
    id: selected.id,
    kind: selected.kind,
    title: selected.label,
    subtitle: rowKindLabel(selected.kind),
    rows: selected.detailRows,
    actions: [
      { id: "filter-related", label: "筛选相关项", enabled: true },
      { id: "focus-visualization", label: "聚焦可视化", enabled: true },
      { id: "graph-qa", label: "以此提问", enabled: true },
      { id: "open-source", label: "打开来源", enabled: false },
    ],
  };
}

function groupedTableRows(sections: GraphWorkbenchSection[]): GraphModuleTableRow[] {
  return sections.flatMap((section) =>
    section.rows.map((row) => ({
      id: row.id,
      type: tableRowType(row.kind),
      label: row.label,
      detail: row.detail,
    })),
  );
}

function graphTabs(activeTab: GraphWorkbenchTabId = "overview"): GraphWorkbenchTab[] {
  const tabs: Array<{ id: GraphWorkbenchTabId; label: string }> = [
    { id: "overview", label: "概览" },
    { id: "list", label: "列表" },
    { id: "timeline", label: "时间线" },
    { id: "visualize", label: "可视化" },
    { id: "qa", label: "问答" },
    { id: "advanced", label: "高级" },
  ];
  return tabs.map((tab) => ({ ...tab, active: tab.id === activeTab }));
}

function compactMeta(values: string[]): string[] {
  return values.filter((value) => value.trim().length > 0 && value !== "证据 0");
}

function compactDetailRows(rows: Array<{ label: string; value: string }>): Array<{ label: string; value: string }> {
  return rows.filter((row) => row.value.trim().length > 0);
}

function rowKindLabel(kind: GraphWorkbenchRow["kind"]): string {
  if (kind === "entity") return "实体";
  if (kind === "relation") return "关系";
  if (kind === "event") return "事件";
  if (kind === "fact") return "事实";
  return "时间线";
}

function tableRowType(kind: GraphWorkbenchRow["kind"]): GraphModuleTableRow["type"] {
  if (kind === "entity") return "node";
  if (kind === "relation") return "edge";
  return "timeline";
}

function graphStateMessage(state: GraphLoadStatus): string {
  if (state === "empty") return "No graph data is available for the current filters.";
  if (state === "malformed") return "Graph data is malformed and cannot be visualized.";
  if (state === "oversized") return "Graph data is too large to visualize. Narrow the filters first.";
  if (state === "cancelled") return "Graph loading was cancelled.";
  if (state === "error") return "Graph loading failed.";
  return "Graph is not loaded.";
}

function graphStatusSummary(status: GraphStatusView | null): GraphModuleStatusSummary | undefined {
  if (!status) return undefined;
  return {
    queueLabel: status.queueLabel || "",
    workerLabel: status.workerLabel || "",
    etaLabel: status.etaLabel || "",
    rateLabel: status.rateLabel || "",
  };
}

function safeMessage(message: string): string {
  return maskDiagnosticText(message);
}

function formatUnixSeconds(seconds: number): string {
  if (seconds <= 0) return "";
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}
