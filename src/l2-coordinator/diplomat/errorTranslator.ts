import { maskDiagnosticText } from "@/utils/maskSecrets";
import { ChatlogHttpError } from "@/l4-atom/network/httpClient";

export type ApiErrorCategory =
  | "abort"
  | "timeout"
  | "network"
  | "http-status"
  | "db-not-ready"
  | "malformed-response"
  | "permission"
  | "unsupported-endpoint"
  | "semantic-not-configured"
  | "semantic-index-building"
  | "semantic-unavailable"
  | "graph-unavailable"
  | "unknown";

export type ApiErrorStatus =
  | "error"
  | "timeout"
  | "cancelled"
  | "blocked";

export interface ApiErrorModel {
  category: ApiErrorCategory;
  status: ApiErrorStatus;
  reason: string;
  message: string;
  recoveryActions: string[];
  diagnosticFamily: string;
  retryable: boolean;
  cancelled: boolean;
  safeDiagnosticSummary: string;
}

const ERROR_MAP: Record<string, string> = {
  EADDRINUSE: "端口被占用，正在自动清理...",
  ECONNREFUSED: "引擎未启动，请稍后重试",
  ETIMEDOUT: "引擎启动超时，请检查系统资源",
  ESIDECAR_EXISTS: "引擎已在运行中",
  EPORT_BLOCKED: "端口无法释放，请手动关闭占用程序后重试",
  EDB_TIMEOUT: "数据库初始化超时，请检查微信数据目录是否正确",
  EDB_NOT_FOUND: "未找到微信数据目录，请手动指定路径",
  EDB_DECRYPT_FAIL: "数据库解密失败，当前微信版本可能不支持",
  EPATH_NOT_FOUND: "数据目录不存在，请重新选择",
  ESEMANTIC_NOT_CONFIGURED: "AI 功能尚未配置，请在右侧面板中完成配置",
  ESEMANTIC_INDEX_NOT_BUILT: "语义索引尚未构建，请先构建索引",
  ESEMANTIC_INDEX_BUILDING: "索引正在构建中，请耐心等待",
  ESEMANTIC_OVERLOAD: "AI 引擎处理繁忙，请稍后重试",
  ESEMANTIC_SSE_ERROR: "AI 回答中断，请重新提问",
  ESEMANTIC_SEARCH_FAIL: "语义搜索失败，请检查索引状态",
  ESEMANTIC_CONNECTION_FAIL: "LLM 连接测试失败，请检查配置",
  ESEMANTIC_TIMEOUT: "AI 回答超时，请尝试简化问题或更换模型",
};

export function translateError(error: string): string {
  for (const [key, message] of Object.entries(ERROR_MAP)) {
    if (error.includes(key)) {
      return message;
    }
  }
  return `未知错误: ${maskDiagnosticText(error, { privacyMode: true })}`;
}

export function toApiErrorModel(error: unknown): ApiErrorModel {
  if (error instanceof ChatlogHttpError) {
    return modelFromHttpError(error);
  }

  if (error instanceof SyntaxError) {
    return createErrorModel({
      category: "malformed-response",
      status: "error",
      reason: "响应格式异常",
      message: "服务返回了无法解析的数据，请重试或检查版本兼容性",
      recoveryActions: ["重试当前操作", "检查应用与 sidecar 版本"],
      diagnosticFamily: "api-contract",
      retryable: true,
      diagnosticText: error.message,
    });
  }

  const text = diagnosticTextFromUnknown(error);
  const normalized = text.toLowerCase();

  if (text.includes("ESEMANTIC_NOT_CONFIGURED")) {
    return createErrorModel({
      category: "semantic-not-configured",
      status: "blocked",
      reason: "语义功能未配置",
      message: ERROR_MAP.ESEMANTIC_NOT_CONFIGURED,
      recoveryActions: ["打开 AI 设置", "完成模型与凭据配置"],
      diagnosticFamily: "semantic",
      retryable: false,
      diagnosticText: text,
    });
  }

  if (text.includes("ESEMANTIC_INDEX_BUILDING")) {
    return createErrorModel({
      category: "semantic-index-building",
      status: "blocked",
      reason: "语义索引构建中",
      message: ERROR_MAP.ESEMANTIC_INDEX_BUILDING,
      recoveryActions: ["等待索引完成", "查看索引状态"],
      diagnosticFamily: "semantic",
      retryable: true,
      diagnosticText: text,
    });
  }

  if (text.includes("ESEMANTIC_")) {
    return createErrorModel({
      category: "semantic-unavailable",
      status: "error",
      reason: "语义服务不可用",
      message: translateError(text),
      recoveryActions: ["检查 AI 配置", "重试当前操作"],
      diagnosticFamily: "semantic",
      retryable: true,
      diagnosticText: text,
    });
  }

  if (isNetworkErrorText(normalized)) {
    return createErrorModel({
      category: "network",
      status: "error",
      reason: "连接本机服务失败",
      message: "无法连接本机服务，请确认服务已启动后重试",
      recoveryActions: ["检查服务状态", "重试当前操作", "返回设置中心"],
      diagnosticFamily: "network",
      retryable: true,
      diagnosticText: text,
    });
  }

  if (normalized.includes("graph unavailable") || normalized.includes("graph failed")) {
    return createErrorModel({
      category: "graph-unavailable",
      status: "error",
      reason: "图谱服务不可用",
      message: "图谱服务暂不可用，请稍后重试或检查图谱状态",
      recoveryActions: ["查看图谱状态", "重试当前操作"],
      diagnosticFamily: "graph",
      retryable: true,
      diagnosticText: text,
    });
  }

  if (
    normalized.includes("permission denied") ||
    normalized.includes("forbidden") ||
    normalized.includes("unauthorized") ||
    normalized.includes(" 401") ||
    normalized.includes(" 403")
  ) {
    return createErrorModel({
      category: "permission",
      status: "error",
      reason: "权限不足",
      message: "当前操作缺少权限，请检查数据目录权限或服务授权状态",
      recoveryActions: ["检查目录权限", "返回设置中心"],
      diagnosticFamily: "security",
      retryable: false,
      diagnosticText: text,
    });
  }

  if (
    normalized.includes("unsupported endpoint") ||
    normalized.includes("not found") ||
    normalized.includes(" 404")
  ) {
    return createErrorModel({
      category: "unsupported-endpoint",
      status: "error",
      reason: "接口不可用",
      message: "当前 sidecar 不支持此接口，请检查版本或切换可用功能",
      recoveryActions: ["检查 sidecar 版本", "返回上一页"],
      diagnosticFamily: "api-contract",
      retryable: false,
      diagnosticText: text,
    });
  }

  return createErrorModel({
    category: "unknown",
    status: "error",
    reason: "未知错误",
    message: translateError(text),
    recoveryActions: ["重试当前操作", "查看诊断信息"],
    diagnosticFamily: "unknown",
    retryable: true,
    diagnosticText: text,
  });
}

function modelFromHttpError(error: ChatlogHttpError): ApiErrorModel {
  if (error.message === "请求已取消") {
    return createErrorModel({
      category: "abort",
      status: "cancelled",
      reason: "请求已取消",
      message: "请求已取消",
      recoveryActions: ["重新发起请求"],
      diagnosticFamily: "network",
      retryable: false,
      cancelled: true,
      diagnosticText: error.message,
    });
  }

  if (error.message === "请求超时") {
    return createErrorModel({
      category: "timeout",
      status: "timeout",
      reason: "请求超时",
      message: "服务响应超时，请稍后重试",
      recoveryActions: ["重试当前操作", "检查服务状态"],
      diagnosticFamily: "network",
      retryable: true,
      diagnosticText: error.message,
    });
  }

  if (error.status === null) {
    return createErrorModel({
      category: "network",
      status: "error",
      reason: "连接本机服务失败",
      message: "无法连接本机服务，请确认服务已启动后重试",
      recoveryActions: ["检查服务状态", "重试当前操作", "返回设置中心"],
      diagnosticFamily: "network",
      retryable: true,
      diagnosticText: error.message,
    });
  }

  const diagnosticText = [error.message, error.body ?? ""].filter(Boolean).join(" ");
  const normalized = diagnosticText.toLowerCase();

  if (error.status === 401 || error.status === 403) {
    return createErrorModel({
      category: "permission",
      status: "error",
      reason: "权限不足",
      message: "当前操作缺少权限，请检查数据目录权限或服务授权状态",
      recoveryActions: ["检查目录权限", "返回设置中心"],
      diagnosticFamily: "security",
      retryable: false,
      diagnosticText,
    });
  }

  if (error.status === 404) {
    return createErrorModel({
      category: "unsupported-endpoint",
      status: "error",
      reason: "接口不可用",
      message: "当前 sidecar 不支持此接口，请检查版本或切换可用功能",
      recoveryActions: ["检查 sidecar 版本", "返回上一页"],
      diagnosticFamily: "api-contract",
      retryable: false,
      diagnosticText,
    });
  }

  if (
    error.status === 503 &&
    (normalized.includes("database not ready") ||
      normalized.includes("db not ready") ||
      normalized.includes("数据库") ||
      normalized.includes("未就绪"))
  ) {
    return createErrorModel({
      category: "db-not-ready",
      status: "error",
      reason: "数据库未就绪",
      message: "数据库尚未准备好，请检查数据库状态后重试",
      recoveryActions: ["检查数据库状态", "返回设置中心"],
      diagnosticFamily: "db",
      retryable: true,
      diagnosticText,
    });
  }

  return createErrorModel({
    category: "http-status",
    status: "error",
    reason: "接口请求失败",
    message: "服务请求失败，请稍后重试",
    recoveryActions: ["重试当前操作", "检查服务状态"],
    diagnosticFamily: "api",
    retryable: true,
    diagnosticText,
  });
}

function createErrorModel(input: {
  category: ApiErrorCategory;
  status: ApiErrorStatus;
  reason: string;
  message: string;
  recoveryActions: string[];
  diagnosticFamily: string;
  retryable: boolean;
  cancelled?: boolean;
  diagnosticText: string;
}): ApiErrorModel {
  return {
    category: input.category,
    status: input.status,
    reason: input.reason,
    message: input.message,
    recoveryActions: input.recoveryActions,
    diagnosticFamily: input.diagnosticFamily,
    retryable: input.retryable,
    cancelled: input.cancelled ?? false,
    safeDiagnosticSummary: maskDiagnosticText(input.diagnosticText, { privacyMode: true }),
  };
}

function diagnosticTextFromUnknown(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isNetworkErrorText(normalized: string): boolean {
  return [
    "failed to fetch",
    "fetch failed",
    "networkerror",
    "network request failed",
    "load failed",
    "econnrefused",
    "econnreset",
    "enotfound",
    "connection refused",
  ].some((token) => normalized.includes(token));
}
