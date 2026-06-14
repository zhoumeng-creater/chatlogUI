import { maskDiagnosticText } from "@/utils/maskSecrets";
import { containsUnsafeDisplayText, formatSafeUserFacingError } from "@/utils/privacyDisplay";
import { toApiErrorModel, type ApiErrorModel } from "./errorTranslator";

export interface UserFacingErrorOptions {
  contextLabel?: string;
}

export interface UserFacingError {
  title: string;
  reason: string;
  actions: string[];
  diagnosticFamily: string;
  retryable: boolean;
  summary: string;
  copyDiagnostics: string;
}

export function toUserFacingError(
  error: ApiErrorModel | unknown,
  options: UserFacingErrorOptions = {},
): UserFacingError {
  const model = isApiErrorModel(error) ? error : toApiErrorModel(error);
  const title = getTitle(model, options.contextLabel);
  const reason = sanitizeVisibleReason(model.message);
  const actions = uniqueActions(model.recoveryActions.length > 0 ? model.recoveryActions : getFallbackActions(model));
  const summary = `${title}：${reason}`;
  const copyDiagnostics = [
    `category=${model.category}`,
    `status=${model.status}`,
    `family=${model.diagnosticFamily}`,
    `retryable=${String(model.retryable)}`,
    `summary=${model.safeDiagnosticSummary}`,
  ].map((line) => maskDiagnosticText(line, { privacyMode: true })).join("\n");

  return {
    title,
    reason,
    actions,
    diagnosticFamily: model.diagnosticFamily,
    retryable: model.retryable,
    summary,
    copyDiagnostics,
  };
}

function isApiErrorModel(error: unknown): error is ApiErrorModel {
  return Boolean(
    error &&
      typeof error === "object" &&
      "category" in error &&
      "status" in error &&
      "message" in error &&
      "safeDiagnosticSummary" in error,
  );
}

function getTitle(model: ApiErrorModel, contextLabel?: string): string {
  const prefix = contextLabel?.trim();

  switch (model.category) {
    case "network":
    case "timeout":
      return prefix ? `${prefix}不可用` : "本机服务不可用";
    case "abort":
      return prefix ? `${prefix}已取消` : "请求已取消";
    case "db-not-ready":
      return "数据库未就绪";
    case "permission":
      return "权限不足";
    case "unsupported-endpoint":
      return "接口不可用";
    case "semantic-not-configured":
      return "AI 功能未配置";
    case "semantic-index-building":
      return "语义索引构建中";
    case "semantic-unavailable":
      return "AI 服务不可用";
    case "graph-unavailable":
      return "图谱服务不可用";
    case "malformed-response":
      return "响应格式异常";
    case "http-status":
      return prefix ? `${prefix}失败` : "服务请求失败";
    case "unknown":
      return prefix ? `${prefix}失败` : "操作失败";
  }
}

function sanitizeVisibleReason(message: string): string {
  const masked = maskDiagnosticText(message, { privacyMode: true }).trim();
  if (!masked || containsUnsafeDisplayText(masked)) {
    return formatSafeUserFacingError(masked);
  }
  return masked;
}

function getFallbackActions(model: ApiErrorModel): string[] {
  if (!model.retryable) return ["返回上一页", "复制脱敏诊断"];
  return ["重试当前操作", "复制脱敏诊断"];
}

function uniqueActions(actions: string[]): string[] {
  return [...new Set([...actions, "复制脱敏诊断"])];
}
