import type {
  SearchRequestErrorField,
  SearchRequestLifecycle,
} from "@l2/data-clerk/stores/useSearchStore";

export type SearchRequestRecoveryActionId =
  | "recover-service"
  | "service-settings"
  | "recheck-database"
  | "data-settings"
  | "reprobe-capabilities"
  | "review-field"
  | "refresh"
  | "retry"
  | "resubmit"
  | "diagnostics";

export interface SearchRequestRecoveryAction {
  id: SearchRequestRecoveryActionId;
  label: string;
  field?: SearchRequestErrorField;
}

export interface SearchRequestRecoveryContext {
  hasSnapshot: boolean;
  retryAvailable: boolean;
  requestRecoveryDisabledReason: string | null;
  resubmitDisabled: boolean;
  resubmitDisabledReason: string | null;
}

export type SearchReadinessRecoveryPhase =
  | "not-configured"
  | "service-starting"
  | "service-stopped"
  | "service-failed"
  | "external-unreachable"
  | "database-loading"
  | "database-not-ready"
  | "ready";

export function buildSearchReadinessRecoveryActions(
  phase: SearchReadinessRecoveryPhase,
): SearchRequestRecoveryAction[] {
  if (phase === "not-configured") {
    return [{ id: "data-settings", label: "前往数据设置" }];
  }
  if (phase === "service-stopped" || phase === "service-failed") {
    return [
      { id: "recover-service", label: "重新启动本机服务" },
      { id: "service-settings", label: "前往服务设置" },
    ];
  }
  if (phase === "external-unreachable") {
    return [
      { id: "recover-service", label: "重新检查外部服务" },
      { id: "service-settings", label: "前往服务设置" },
    ];
  }
  if (phase === "database-not-ready") {
    return [
      { id: "recheck-database", label: "重新加载数据库" },
      { id: "data-settings", label: "前往数据设置" },
    ];
  }
  return [];
}

export function buildSearchRequestRecoveryActions(
  lifecycle: SearchRequestLifecycle,
  context: SearchRequestRecoveryContext,
): SearchRequestRecoveryAction[] {
  if (lifecycle.status !== "error") return [];

  switch (lifecycle.errorCode) {
    case "service_unavailable":
      return [
        { id: "recover-service", label: "重新检查并启动本机服务" },
        { id: "service-settings", label: "前往服务设置" },
      ];
    case "database_unavailable":
      return [
        { id: "recheck-database", label: "重新检查数据库" },
        { id: "data-settings", label: "前往数据设置" },
      ];
    case "capability_unavailable":
      return [
        { id: "reprobe-capabilities", label: "重新检测搜索能力" },
        { id: "service-settings", label: "前往服务设置" },
      ];
    case "invalid_request":
      if (lifecycle.errorField) {
        return [{
          id: "review-field",
          label: searchFieldReviewLabel(lifecycle.errorField),
          field: lifecycle.errorField,
        }];
      }
      return context.resubmitDisabled
        ? []
        : [{ id: "resubmit", label: "检查并重新提交当前草稿" }];
    case "permission_denied":
      return [
        { id: "data-settings", label: "检查数据与文件权限" },
        { id: "diagnostics", label: "查看脱敏诊断" },
      ];
    case "identity_conflict":
      return [
        ...(context.hasSnapshot && !context.requestRecoveryDisabledReason
          ? [{ id: "refresh" as const, label: "刷新搜索快照" }]
          : !context.resubmitDisabled && !context.requestRecoveryDisabledReason
            ? [{ id: "resubmit" as const, label: "重新提交当前草稿" }]
            : []),
        { id: "diagnostics", label: "查看脱敏诊断" },
      ];
    case "snapshot_expired":
    case "stale_revision":
      return context.hasSnapshot && !context.requestRecoveryDisabledReason
        ? [{ id: "refresh", label: "刷新上次结果" }]
        : [];
    case "timeout":
      return context.retryAvailable && !context.requestRecoveryDisabledReason
        ? [{ id: "retry", label: "重试上次请求" }]
        : [];
    case "request_failed":
      return [
        ...(context.retryAvailable && !context.requestRecoveryDisabledReason
          ? [{ id: "retry" as const, label: "重试上次请求" }]
          : []),
        { id: "diagnostics", label: "查看脱敏诊断" },
      ];
  }
}

function searchFieldReviewLabel(field: SearchRequestErrorField): string {
  if (field === "keyword") return "检查关键词";
  if (field === "scope") return "检查搜索范围";
  if (field === "categories") return "检查消息类型";
  if (field === "senders") return "检查发送者筛选";
  return "检查日期范围";
}
