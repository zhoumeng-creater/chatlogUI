import type { ReadOnlySqlClassification } from "@l4/network";
import type {
  DeveloperToolsLoadStatus,
  EndpointRunnerHistoryItem,
} from "@l2/data-clerk/stores/useDeveloperToolsStore";

export function formatDeveloperStatus(status: DeveloperToolsLoadStatus): string {
  const labels: Record<DeveloperToolsLoadStatus, string> = {
    idle: "待加载",
    loading: "加载中",
    ready: "就绪",
    empty: "无数据",
    error: "异常",
  };
  return labels[status];
}

export function formatSqlGuardCopy(classification: ReadOnlySqlClassification): string {
  if (classification.allowed) return `允许执行 · ${classification.kind}`;
  return `已阻止 · ${classification.reason ?? "unsupported"}`;
}

export function formatRunnerHistoryLabel(item: EndpointRunnerHistoryItem): string {
  const params = item.parameterKeys.length > 0 ? ` · ${item.parameterKeys.join(",")}` : "";
  return `${item.method} ${item.endpointFamily} · HTTP ${item.status} · ${item.durationMs}ms${params}`;
}

export function formatDbTableLabel(table: string, privacyOn: boolean): string {
  if (!table) return "table";
  return privacyOn ? "已隐藏表" : table;
}

export function formatDbTableFilterValue(value: string, privacyOn: boolean): string {
  return privacyOn ? "" : value;
}

export function formatDbSearchInputValue(value: string, privacyOn: boolean): string {
  return privacyOn ? "" : value;
}

export function formatEndpointParamInputValue(
  param: { kind: "text" | "number" | "select" | "boolean"; label: string },
  value: string | number | boolean | undefined,
  privacyOn: boolean,
): string {
  if (value === undefined || value === null) return "";
  if (privacyOn && param.kind === "text") return "";
  return String(value);
}

export function endpointParamPlaceholder(
  param: { kind: "text" | "number" | "select" | "boolean"; label: string; name?: string },
  privacyOn: boolean,
): string {
  if (privacyOn && param.kind === "text") return `隐私模式已隐藏${param.label}`;
  return param.name ?? param.label;
}

export function shouldDisableEndpointParamInput(
  param: { kind: "text" | "number" | "select" | "boolean" },
  privacyOn: boolean,
): boolean {
  return privacyOn && param.kind === "text";
}
