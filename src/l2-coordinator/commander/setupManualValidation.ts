import type { ConfigValidationError, ServerConfigDraft } from "@l4/system";
import { validateChatlogServiceBaseUrl } from "@l4/network/chatlogEndpoint";
import {
  containsUnsafeDisplayText,
  formatSafeUserFacingError,
} from "@/utils/privacyDisplay";
import { validateManualSecretKeyFormat } from "@/utils/manualSecretKeyValidation";

export type ManualConfigField =
  | "dataDir"
  | "workDir"
  | "platform"
  | "version"
  | "fullVersion"
  | "dataKey"
  | "imgKey"
  | "httpAddr";

export interface ManualConfigValidationView {
  valid: boolean;
  fieldErrors: Partial<Record<ManualConfigField, string>>;
  summary: string | null;
}

export function deriveManualConfigValidationView(
  draft: ServerConfigDraft,
): ManualConfigValidationView {
  const fieldErrors: Partial<Record<ManualConfigField, string>> = {};

  const dataDir = draft.dataDir?.trim() ?? "";
  if (!dataDir) {
    fieldErrors.dataDir = "请选择微信数据目录。";
  }

  const dataKey = draft.dataKey?.trim() ?? "";
  const imgKey = draft.imgKey?.trim() ?? "";

  if (dataDir && !dataKey) {
    fieldErrors.dataKey = "数据密钥缺失，请重新选择数据目录或在密钥手动覆盖中粘贴。";
  } else {
    const dataKeyFormatError = validateManualSecretKeyFormat(dataKey, "数据密钥");
    if (dataKeyFormatError) {
      fieldErrors.dataKey = dataKeyFormatError;
    }
  }

  const imgKeyFormatError = validateManualSecretKeyFormat(imgKey, "媒体密钥");
  if (imgKeyFormatError) {
    fieldErrors.imgKey = imgKeyFormatError;
  }

  const httpAddr = draft.httpAddr?.trim();
  if (!httpAddr) {
    fieldErrors.httpAddr = "请输入本机 HTTP 服务地址。";
  } else {
    const validation = validateChatlogServiceBaseUrl(httpAddr);
    if (!validation.ok) {
      fieldErrors.httpAddr = toSafeManualFieldError("httpAddr", validation.error);
    }
  }

  return toValidationView(fieldErrors);
}

export function mapConfigValidationErrorsToManualFields(
  errors: ConfigValidationError[],
): ManualConfigValidationView {
  const fieldErrors: Partial<Record<ManualConfigField, string>> = {};

  for (const error of errors) {
    const field = normalizeManualConfigField(error.field);
    if (!field) continue;
    if (isHiddenDirectoryMetadataField(field)) {
      fieldErrors.dataDir = "目录配置不完整，请重新选择包含有效 chatlog.json 的微信数据目录。";
      continue;
    }
    fieldErrors[field] = toSafeManualFieldError(field, error.message);
  }

  return toValidationView(fieldErrors);
}

function normalizeManualConfigField(field: string): ManualConfigField | null {
  switch (field) {
    case "dataDir":
    case "data_dir":
      return "dataDir";
    case "workDir":
    case "work_dir":
      return "workDir";
    case "platform":
      return "platform";
    case "version":
      return "version";
    case "fullVersion":
    case "full_version":
      return "fullVersion";
    case "dataKey":
    case "data_key":
      return "dataKey";
    case "imgKey":
    case "img_key":
      return "imgKey";
    case "httpAddr":
    case "http_addr":
      return "httpAddr";
    default:
      return null;
  }
}

function isHiddenDirectoryMetadataField(field: ManualConfigField): boolean {
  return field === "platform" || field === "version" || field === "fullVersion";
}

function toValidationView(
  fieldErrors: Partial<Record<ManualConfigField, string>>,
): ManualConfigValidationView {
  const count = Object.keys(fieldErrors).length;
  return {
    valid: count === 0,
    fieldErrors,
    summary: count > 0 ? `请检查 ${count} 个字段后重试。` : null,
  };
}

function toSafeManualFieldError(field: ManualConfigField, message: string): string {
  if (containsUnsafeDisplayText(message)) {
    return formatSafeUserFacingError(message);
  }

  if (field === "httpAddr") {
    return message.trim() || "服务地址不正确，请输入本机 HTTP origin。";
  }

  return formatSafeUserFacingError(message);
}
