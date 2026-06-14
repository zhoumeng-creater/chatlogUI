import type { SettingsState } from "@/l2-coordinator/api-docs/settings";
import type { ConfigSource, SetupMode } from "@/l2-coordinator/data-clerk/types/setup";
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import type { SemanticModuleKind } from "./semanticViewModel";
import { formatPrivatePathSummary } from "@/utils/privacyDisplay";
import { settingsMessagesZhCN } from "./messages.zh-CN";

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
  legacyIgnoredLabel: string;
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
    title: settingsMessagesZhCN.settings.ai.title,
    statusLabel: status.statusLabel,
    statusTone: status.statusTone,
    description: settingsMessagesZhCN.settings.ai.description,
    indexLabel: indexSummary(input.indexStatus, input.privacyOn),
    primaryAction: {
      label: settingsMessagesZhCN.settings.ai.primaryAction,
      target: "/ai?source=settings&panel=semantic",
    },
    legacyIgnoredLabel: settingsMessagesZhCN.settings.ai.legacyIgnored,
    legacyIgnored: hasLegacyAiFields(input.legacySettings),
  };
}

export function deriveSettingsDataServiceSummary(input: {
  dataDir: string | null | undefined;
  legacyWxDataPath?: SettingsState["wxDataPath"];
  hasDataKey: boolean;
  serviceLabel: string;
  mode: SetupMode;
  source?: ConfigSource;
  profileConfigured?: boolean;
  httpReady: boolean;
  dbReady: boolean;
  privacyOn: boolean;
}): SettingsDataServiceSummary {
  const profileConfigured = input.profileConfigured ?? (input.source ? input.source !== "none" : true);

  return {
    title: settingsMessagesZhCN.settings.data.title,
    pathSummary: input.dataDir
      ? formatPrivatePathSummary(input.dataDir, "data-dir")
      : settingsMessagesZhCN.settings.data.dataDirectoryUnset,
    serviceLabel: serviceSummaryLabel(input.mode, profileConfigured),
    serviceStatusLabel: serviceStatus(input.httpReady, input.dbReady),
    serviceStatusTone: input.dbReady ? "success" : input.httpReady ? "warning" : "neutral",
    decryptionKeyLabel: input.hasDataKey
      ? settingsMessagesZhCN.settings.data.keyConfiguredPlaceholder
      : settingsMessagesZhCN.settings.data.keyMissingPlaceholder,
    primaryAction: {
      label: settingsMessagesZhCN.settings.data.primaryAction,
      target: "/",
    },
    showIndependentBaseUrlForm: false,
  };
}

function serviceSummaryLabel(mode: SetupMode, profileConfigured: boolean): string {
  if (!profileConfigured) return "本机聊天服务未配置";
  return mode === "external" ? "已连接外部本机聊天服务" : "应用管理的本机聊天服务";
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
