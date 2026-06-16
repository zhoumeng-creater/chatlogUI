import type {
  GraphLoadStatus,
  GraphQueryView,
  GraphStatusView,
  GraphTimelineView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import { containsUnsafeDisplayText } from "@/utils/privacyDisplay";
import { timeLabel } from "./graphControlModel";

export interface GraphAppliedRequest {
  keyword?: string;
  window?: string;
  entity?: string;
  relation?: string;
  limit?: number;
  start?: string;
  end?: string;
}

export type GraphContextFreshnessState =
  | "fresh"
  | "stale"
  | "partial"
  | "empty"
  | "error"
  | "cancelled";

export interface GraphContextSummaryMetric {
  label: string;
  value: number;
}

export interface GraphContextSource {
  kind: "graph" | "search" | "ai" | "workbench" | "media" | "sns" | "unknown";
  label: string;
}

export interface GraphCommanderContextInput {
  routeSource?: string | null;
  sourceLabel?: string | null;
  focusLabel?: string | null;
  scopeLabel?: string | null;
  privacyOn: boolean;
}

export interface GraphCommanderContextView {
  source: GraphContextSource;
  scopeSummary: string;
}

export interface GraphContextSummaryInput {
  loadStatus: GraphLoadStatus | "failed" | "unavailable";
  statusSummary: GraphStatusView | null;
  query?: GraphQueryView | null;
  visualize: GraphVisualizeView | null;
  timeline?: GraphTimelineView | null;
  appliedRequest?: GraphAppliedRequest | null;
  draftRequest?: GraphAppliedRequest | null;
  source?: GraphContextSource | null;
  lastLoadedAt?: string | null;
  lastRefreshedAt?: string | null;
  privacyOn: boolean;
}

export interface GraphContextSummaryView {
  title: string;
  statusLabel: string;
  freshnessState: GraphContextFreshnessState;
  metrics: GraphContextSummaryMetric[];
  filterChips: string[];
  sourceLabel: string;
  generatedLabel: string;
  refreshedLabel: string;
  warnings: string[];
  recoveryActions: string[];
  technicalDetails: string[];
}

export function buildGraphCommanderContext(
  input: GraphCommanderContextInput,
): GraphCommanderContextView {
  const kind = routeSourceKind(input.routeSource);
  const baseLabel = input.sourceLabel?.trim() || defaultSourceLabel(kind);
  const hasFocus = Boolean(input.focusLabel?.trim());
  const label = hasFocus ? `${baseLabel} · 上下文定位` : baseLabel;

  return {
    source: { kind, label },
    scopeSummary: safeScopeSummary(input.scopeLabel, input.privacyOn),
  };
}

export function buildGraphSourceWorkbenchRoute(smoke?: string | null): string {
  const smokeValue = smoke?.trim() || "";
  const params = new URLSearchParams();
  params.set("source", "graph");
  params.set("returnRoute", appendSmokeQuery("/graph", smokeValue));
  if (smokeValue) params.set("codex-smoke", smokeValue);
  return `/workbench?${params.toString()}`;
}

export function buildGraphContextSummary(input: GraphContextSummaryInput): GraphContextSummaryView {
  const freshnessState = deriveFreshnessState(input);
  const warnings = deriveWarnings(input);
  return {
    title: "当前图谱说明",
    statusLabel: freshnessLabel(freshnessState),
    freshnessState,
    metrics: deriveMetrics(input),
    filterChips: deriveFilterChips(input.appliedRequest, input.privacyOn),
    sourceLabel: `来源：${safeSourceLabel(input.source, input.privacyOn)}`,
    generatedLabel: `生成：${formatGraphGeneratedTime(input.visualize, input.statusSummary)}`,
    refreshedLabel: `刷新：${formatDateTime(input.lastRefreshedAt || input.lastLoadedAt || input.statusSummary?.lastUpdatedAt)}`,
    warnings,
    recoveryActions: deriveRecoveryActions(input, freshnessState),
    technicalDetails: deriveTechnicalDetails(input.statusSummary),
  };
}

function appendSmokeQuery(route: string, smoke: string): string {
  if (!smoke) return route;
  const params = new URLSearchParams();
  params.set("codex-smoke", smoke);
  return `${route}?${params.toString()}`;
}

function routeSourceKind(source: string | null | undefined): GraphContextSource["kind"] {
  const normalized = source?.trim().toLowerCase();
  if (normalized === "search") return "search";
  if (normalized === "ai" || normalized === "ai-evidence") return "ai";
  if (normalized === "workbench" || normalized === "inspector") return "workbench";
  if (normalized === "media") return "media";
  if (normalized === "sns") return "sns";
  if (normalized === "graph") return "graph";
  if (normalized) return "unknown";
  return "graph";
}

function defaultSourceLabel(kind: GraphContextSource["kind"]): string {
  switch (kind) {
    case "search":
      return "来自搜索";
    case "ai":
      return "来自 AI 证据";
    case "workbench":
      return "来自会话";
    case "media":
      return "来自媒体";
    case "sns":
      return "来自朋友圈";
    case "unknown":
      return "来自上下文入口";
    case "graph":
      return "图谱当前视图";
  }
}

function safeScopeSummary(scopeLabel: string | null | undefined, privacyOn: boolean): string {
  const label = scopeLabel?.trim() || "全部会话";
  if (!privacyOn && !containsUnsafeDisplayText(label)) return label;
  if (label.includes("当前会话")) return "当前会话（已隐藏）";
  if (label.includes("全部会话")) return "全部会话";
  return "当前范围已隐藏";
}

function deriveMetrics(input: GraphContextSummaryInput): GraphContextSummaryMetric[] {
  const counts = input.statusSummary?.counts;
  const query = input.query;
  const timelineCount = input.timeline?.count ?? input.visualize?.summary.timelineCount ?? 0;
  return [
    { label: "实体", value: counts?.entities ?? query?.entities.length ?? input.visualize?.summary.nodeCount ?? 0 },
    { label: "关系", value: counts?.relations ?? query?.relations.length ?? input.visualize?.summary.edgeCount ?? 0 },
    { label: "事件", value: counts?.events ?? query?.events.length ?? timelineCount },
    { label: "事实", value: counts?.facts ?? query?.facts.length ?? 0 },
    { label: "来源", value: counts?.sources ?? 0 },
  ];
}

function deriveFilterChips(request: GraphAppliedRequest | null | undefined, privacyOn: boolean): string[] {
  if (!request) return ["筛选：未应用"];
  const chips: string[] = [];
  if (request.keyword?.trim()) chips.push(`关键词：${safePrivateLabel(request.keyword, privacyOn, "已隐藏关键词")}`);
  if (request.window !== undefined) chips.push(`时间：${timeLabel(request.window || "")}`);
  if (request.entity?.trim()) chips.push(`实体类型：${safePlainLabel(request.entity)}`);
  if (request.relation?.trim()) chips.push(`关系类型：${safePlainLabel(request.relation)}`);
  if (request.limit) chips.push(`上限：${request.limit.toLocaleString("zh-CN")}`);
  if (request.start || request.end) chips.push(`日期：${request.start || "不限"} 至 ${request.end || "不限"}`);
  return chips.length > 0 ? chips : ["筛选：无"];
}

function deriveFreshnessState(input: GraphContextSummaryInput): GraphContextFreshnessState {
  if (input.loadStatus === "cancelled") return "cancelled";
  if (input.loadStatus === "error" || input.loadStatus === "failed" || input.loadStatus === "malformed" || input.statusSummary?.state === "error") {
    return "error";
  }
  if (input.loadStatus === "empty" || input.visualize?.state === "empty") return "empty";

  const hasUnappliedChanges = !sameRequest(input.appliedRequest, input.draftRequest);
  const activeWork = Boolean(input.statusSummary?.running || input.statusSummary?.pending || input.statusSummary?.processing);
  const hasFailures = Boolean(input.statusSummary?.failed);
  if (hasUnappliedChanges || activeWork || hasFailures || input.loadStatus === "oversized") return "partial";
  if (!input.visualize && !input.query && !input.timeline) return "stale";
  return "fresh";
}

function deriveWarnings(input: GraphContextSummaryInput): string[] {
  const warnings: string[] = [];
  if (!sameRequest(input.appliedRequest, input.draftRequest)) {
    warnings.push("筛选条件有未应用更改，当前摘要仍显示上一次刷新结果。");
  }
  const activeCount = (input.statusSummary?.pending ?? 0) + (input.statusSummary?.processing ?? 0);
  if (activeCount > 0) {
    warnings.push(`图谱任务仍有 ${activeCount.toLocaleString("zh-CN")} 项处理中或等待处理。`);
  }
  if ((input.statusSummary?.failed ?? 0) > 0) {
    warnings.push(`${input.statusSummary!.failed.toLocaleString("zh-CN")} 项图谱处理失败，结果可能不完整。`);
  }
  if (input.loadStatus === "oversized") warnings.push("当前图谱过大，已保留列表与导出路径，请缩小筛选后再打开 3D。");
  if (input.loadStatus === "empty" || input.visualize?.state === "empty") warnings.push("当前图谱没有条目。");
  if (input.loadStatus === "cancelled") warnings.push("图谱加载已停止，当前显示的是上一次可用结果或空结果。");
  const error = input.statusSummary?.lastError || input.visualize?.error || "";
  if (input.loadStatus === "error" && error) {
    warnings.push(input.privacyOn ? "图谱加载失败，详情已脱敏。" : `图谱加载失败：${safeDiagnostic(error, false)}`);
  }
  return warnings;
}

function deriveRecoveryActions(
  input: GraphContextSummaryInput,
  freshnessState: GraphContextFreshnessState,
): string[] {
  if (freshnessState === "empty") return ["清除筛选", "打开高级筛选", "刷新图谱摘要"];
  if (freshnessState === "error") return ["重试", "调整筛选", "复制脱敏诊断"];
  if (freshnessState === "cancelled") return ["重新加载", "保留当前结果"];
  if (!sameRequest(input.appliedRequest, input.draftRequest)) return ["应用筛选", "重置筛选"];
  if (freshnessState === "partial") return ["刷新图谱摘要", "查看列表", "导出当前结构"];
  return ["查看列表", "打开时间线", "按需打开可视化"];
}

function deriveTechnicalDetails(status: GraphStatusView | null): string[] {
  if (!status) return [];
  return [
    status.workerLabel,
    status.queueLabel,
    status.etaLabel,
    status.rateLabel,
  ].filter((item): item is string => Boolean(item?.trim()));
}

function safeSourceLabel(source: GraphContextSource | null | undefined, privacyOn: boolean): string {
  if (!source) return "图谱当前视图";
  if (privacyOn || containsUnsafeDisplayText(source.label)) {
    switch (source.kind) {
      case "search":
        return "来自搜索";
      case "ai":
        return "来自 AI 证据";
      case "workbench":
        return "来自会话";
      case "media":
        return "来自媒体";
      case "sns":
        return "来自朋友圈";
      case "graph":
        return "图谱当前视图";
      default:
        return "当前来源已隐藏";
    }
  }
  return source.label.trim() || "图谱当前视图";
}

function safePrivateLabel(value: string, privacyOn: boolean, redactedLabel: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (privacyOn || containsUnsafeDisplayText(trimmed)) return redactedLabel;
  return safeDiagnostic(trimmed, false);
}

function safePlainLabel(value: string): string {
  return containsUnsafeDisplayText(value) ? "已隐藏" : value.trim();
}

function safeDiagnostic(value: string, privacyOn: boolean): string {
  return maskDiagnosticText(value, { privacyMode: privacyOn });
}

function sameRequest(a?: GraphAppliedRequest | null, b?: GraphAppliedRequest | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return normalizeRequest(a) === normalizeRequest(b);
}

function normalizeRequest(request: GraphAppliedRequest): string {
  return JSON.stringify({
    keyword: request.keyword?.trim() || "",
    window: request.window || "",
    entity: request.entity?.trim() || "",
    relation: request.relation?.trim() || "",
    limit: Number.isFinite(request.limit) ? request.limit : 0,
    start: request.start || "",
    end: request.end || "",
  });
}

function freshnessLabel(state: GraphContextFreshnessState): string {
  switch (state) {
    case "fresh":
      return "已更新";
    case "stale":
      return "待刷新";
    case "partial":
      return "部分数据";
    case "empty":
      return "暂无数据";
    case "error":
      return "需要处理";
    case "cancelled":
      return "已停止";
  }
}

function formatGraphGeneratedTime(
  visualize: GraphVisualizeView | null,
  status: GraphStatusView | null,
): string {
  if (visualize?.generatedAt) return formatUnixSeconds(visualize.generatedAt);
  return formatDateTime(status?.lastUpdatedAt);
}

function formatUnixSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "未生成";
  return formatDateTime(new Date(seconds * 1000).toISOString());
}

function formatDateTime(value?: string | null): string {
  if (!value?.trim()) return "待刷新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}
