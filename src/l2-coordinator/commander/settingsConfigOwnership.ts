import type { SettingsState } from "@/l2-coordinator/api-docs/settings";
import type { SetupMode } from "@/l2-coordinator/data-clerk/types/setup";
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import type { SemanticModuleKind } from "./semanticViewModel";
import { formatPrivatePathSummary } from "@/utils/privacyDisplay";

export interface LegacySettingsAiFields {
  aiProvider?: unknown;
  aiEndpoint?: unknown;
  aiModel?: unknown;
  aiCredentialConfigured?: unknown;
}

export interface SettingsAiSemanticSummary {
  title: string;
  statusLabel: string;
  statusTone: "neutral" | "success" | "warning" | "danger" | "info" | "ai";
  description: string;
  indexLabel: string;
  primaryAction: {
    label: string;
    target: string;
  };
  legacyIgnored: boolean;
}

export interface SettingsDataServiceSummary {
  title: string;
  pathSummary: string;
  serviceLabel: string;
  serviceStatusLabel: string;
  serviceStatusTone: "neutral" | "success" | "warning" | "danger" | "info";
  decryptionKeyLabel: string;
  primaryAction: {
    label: string;
    target: string;
  };
  showIndependentBaseUrlForm: false;
}

export function deriveSettingsAiSemanticSummary(input: {
  moduleKind: SemanticModuleKind;
  indexStatus: IndexStatusResponse | null;
  privacyOn: boolean;
  legacySettings?: LegacySettingsAiFields | null;
}): SettingsAiSemanticSummary {
  const status = aiStatus(input.moduleKind);

  return {
    title: "AI 与语义",
    statusLabel: status.statusLabel,
    statusTone: status.statusTone,
    description: "语义搜索、问答、模型连接测试、API Key 和索引参数由 AI 工作台负责。Settings 只显示状态和入口。",
    indexLabel: indexSummary(input.indexStatus, input.privacyOn),
    primaryAction: {
      label: "前往 AI 工作台配置",
      target: "/ai?source=settings&panel=semantic",
    },
    legacyIgnored: hasLegacyAiFields(input.legacySettings),
  };
}

export function deriveSettingsDataServiceSummary(input: {
  wxDataPath: SettingsState["wxDataPath"];
  serviceLabel: string;
  mode: SetupMode;
  httpReady: boolean;
  dbReady: boolean;
  privacyOn: boolean;
}): SettingsDataServiceSummary {
  return {
    title: "数据与服务",
    pathSummary: formatPrivatePathSummary(input.wxDataPath, "data-dir"),
    serviceLabel: serviceSummaryLabel(input.mode),
    serviceStatusLabel: serviceStatus(input.httpReady, input.dbReady),
    serviceStatusTone: input.dbReady ? "success" : input.httpReady ? "warning" : "neutral",
    decryptionKeyLabel: "请在设置中心配置",
    primaryAction: {
      label: "前往设置中心修改",
      target: "/",
    },
    showIndependentBaseUrlForm: false,
  };
}

function serviceSummaryLabel(mode: SetupMode): string {
  return mode === "external" ? "已连接外部本机服务" : "应用管理的本机服务";
}

function aiStatus(kind: SemanticModuleKind): Pick<SettingsAiSemanticSummary, "statusLabel" | "statusTone"> {
  switch (kind) {
    case "checking_config":
      return { statusLabel: "检查中", statusTone: "info" };
    case "setup_required":
      return { statusLabel: "需要配置", statusTone: "warning" };
    case "index_running":
      return { statusLabel: "索引中", statusTone: "info" };
    case "index_paused":
      return { statusLabel: "索引暂停", statusTone: "warning" };
    case "ready":
      return { statusLabel: "可用", statusTone: "ai" };
    case "failed":
      return { statusLabel: "异常", statusTone: "danger" };
    case "index_unavailable":
    default:
      return { statusLabel: "索引未构建", statusTone: "neutral" };
  }
}

function indexSummary(indexStatus: IndexStatusResponse | null, privacyOn: boolean): string {
  if (!indexStatus) return "索引未检查";
  const state = indexStatus.state ?? indexStatus.status;
  if (state === "ready") return "索引已就绪";
  if (state === "running" || state === "building") {
    return indexStatus.progressLabel || "索引构建中";
  }
  if (state === "paused") return "索引已暂停";
  if (state === "error") return "索引异常";
  return privacyOn ? "索引状态已隐藏细节" : "索引尚不可用";
}

function serviceStatus(httpReady: boolean, dbReady: boolean): string {
  if (dbReady) return "服务与数据库已就绪";
  if (httpReady) return "服务已连接，数据库尚未就绪";
  return "服务尚未连接";
}

function hasLegacyAiFields(value: LegacySettingsAiFields | null | undefined): boolean {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value.aiProvider !== undefined
    || value.aiEndpoint !== undefined
    || value.aiModel !== undefined
    || value.aiCredentialConfigured !== undefined,
  );
}
