import {
  classifyReadOnlySql,
  getEndpointCatalog,
  getEndpointCatalogEntry,
  type EndpointCatalogEntry,
  type EndpointRunResult,
} from "@l4/network";
import type { DeveloperToolsLoadStatus } from "@l2/data-clerk/stores/useDeveloperToolsStore";
import type { DeveloperToolsStoreSnapshot } from "./dbExplorerViewModel";

export interface EndpointCatalogGroupView {
  id: EndpointCatalogEntry["group"];
  label: string;
  entries: EndpointCatalogEntry[];
}

export interface EndpointRequestSummary {
  method: EndpointCatalogEntry["method"];
  pathTemplate: string;
  endpointFamily: string;
  parameterKeys: string[];
  requiresConfirmation: boolean;
}

export interface EndpointParamDraftView {
  name: string;
  value: string;
}

export interface EndpointRunnerView {
  catalogGroups: EndpointCatalogGroupView[];
  selectedEntry: EndpointCatalogEntry | null;
  requestSummary: EndpointRequestSummary | null;
  paramDrafts: EndpointParamDraftView[];
  result: EndpointRunResult | null;
  history: DeveloperToolsStoreSnapshot["runnerHistory"];
  canRun: boolean;
  status: DeveloperToolsLoadStatus;
  errorCopy: string | null;
}

const GROUP_LABELS: Record<EndpointCatalogEntry["group"], string> = {
  core: "核心",
  chat: "聊天",
  media: "媒体",
  sns: "朋友圈",
  db: "数据库",
  mcp: "MCP",
  system: "系统",
};

const GROUP_ORDER: EndpointCatalogEntry["group"][] = ["core", "chat", "media", "sns", "db", "mcp", "system"];

export function buildEndpointRunnerView(
  state: DeveloperToolsStoreSnapshot,
  privacyOn: boolean,
): EndpointRunnerView {
  const catalog = getEndpointCatalog();
  const selectedEntry = getEndpointCatalogEntry(state.selectedEndpointId) ?? catalog[0] ?? null;
  const parameterKeys = selectedEntry
    ? selectedEntry.params
        .map((param) => param.name)
        .filter((name) => hasValue(state.endpointParams[name]))
    : [];
  const requestSummary = selectedEntry
    ? {
        method: selectedEntry.method,
        pathTemplate: selectedEntry.pathTemplate,
        endpointFamily: selectedEntry.endpointFamily,
        parameterKeys,
        requiresConfirmation: selectedEntry.requiresConfirmation === true,
      }
    : null;

  return {
    catalogGroups: buildCatalogGroups(catalog),
    selectedEntry,
    requestSummary,
    paramDrafts: selectedEntry
      ? selectedEntry.params.map((param) => ({
          name: param.name,
          value: formatDraftValue(state.endpointParams[param.name], privacyOn),
        }))
      : [],
    result: state.runnerResult,
    history: state.runnerHistory,
    canRun: selectedEntry ? canRunSelectedEntry(selectedEntry, state) : false,
    status: state.runnerStatus,
    errorCopy: state.runnerError,
  };
}

function buildCatalogGroups(catalog: EndpointCatalogEntry[]): EndpointCatalogGroupView[] {
  return GROUP_ORDER.map((id) => ({
    id,
    label: GROUP_LABELS[id],
    entries: catalog.filter((entry) => entry.group === id),
  }));
}

function canRunSelectedEntry(
  entry: EndpointCatalogEntry,
  state: DeveloperToolsStoreSnapshot,
): boolean {
  if (state.runnerStatus === "loading") return false;
  if (entry.requiresConfirmation) return false;

  for (const param of entry.params) {
    if (param.required && !hasValue(state.endpointParams[param.name])) return false;
  }

  if (entry.id === "db_query") {
    return classifyReadOnlySql(String(state.endpointParams.sql ?? "")).allowed;
  }

  return true;
}

function formatDraftValue(value: unknown, privacyOn: boolean): string {
  if (!hasValue(value)) return "";
  return privacyOn ? "已隐藏" : String(value);
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}
