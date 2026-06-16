type PrivatePathKind = "data-dir" | "work-dir" | "config-dir" | "generic";

const UNSAFE_DISPLAY_PATTERNS = [
  /[A-Z]:[\\/]+Users[\\/]+/i,
  /[A-Z]:[\\/]+[^\n]*(?:WeChat Files|微信 Files|微信文件)/i,
  /(?:^|\s)[^\s\n]*WeChat Files[^\n]*/i,
  /wxid_[A-Za-z0-9_-]+/i,
  /\bdata[_-]?key\s*[=:]/i,
  /\bapi[_-]?key\s*[=:]/i,
  /\btoken\s*[=:]/i,
  /\bsecret\s*[=:]/i,
  /\bBearer\s+[^\s,;]+/i,
  /\bsk-[A-Za-z0-9_-]+/i,
  /\/api\/v1\/sns\/media\/proxy\?/i,
];

export function formatPrivatePathSummary(
  value?: string | null,
  kind: PrivatePathKind = "generic",
): string {
  if (!value?.trim()) return "未设置";

  if (kind === "data-dir") return "已选择微信数据目录";
  if (kind === "work-dir") return "本机工作目录已隐藏";
  if (kind === "config-dir") return "配置目录已隐藏";
  return "本机目录已隐藏";
}

export function formatExportPathSummary(value?: string | null): string {
  if (!value?.trim()) return "诊断已导出";

  const fileName = value.split(/[\\/]/).filter(Boolean).pop();
  if (!fileName || containsUnsafeDisplayText(fileName)) {
    return "诊断已导出";
  }

  return fileName;
}

export interface BusinessExportLocationInput {
  fileName?: string | null;
  extension?: string | null;
  bytesWritten?: number | null;
}

export function formatBusinessExportPathSummary(value?: string | null): string {
  if (!value?.trim()) return "已保存到所选位置";

  const fileName = value.split(/[\\/]/).filter(Boolean).pop();
  if (!fileName || containsUnsafeDisplayText(fileName)) {
    return "已保存到所选位置";
  }

  return fileName;
}

export function formatBusinessExportLocationSummary({
  fileName,
  bytesWritten,
}: BusinessExportLocationInput): string {
  const safeName = formatBusinessExportPathSummary(fileName);
  const size = formatByteSummary(bytesWritten);
  return size ? `${safeName} · ${size}` : safeName;
}

export function formatConfiguredSecretState(value: string | boolean | null | undefined): string {
  if (typeof value === "boolean") return value ? "已配置" : "未配置";
  return value?.trim() ? "已配置" : "未配置";
}

export function maskDisplayText(value: string | null | undefined): string {
  const text = value?.trim() || "******";
  return text.replace(/[^\s]/g, "*");
}

export function formatLocalServiceDisplay(value?: string | null): string {
  if (!value?.trim()) return "本机服务未配置";

  try {
    const normalized = value.includes("://") ? value : `http://${value}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const port = parsed.port ? `:${parsed.port}` : "";

    if (host === "127.0.0.1" || host === "localhost" || host === "::1") {
      return `本机服务 ${host}${port}`;
    }
  } catch {
    return "本机服务地址无效";
  }

  return "服务地址已隐藏";
}

export function formatSafeUserFacingError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const fallback = "操作失败，请重试或复制脱敏诊断。";

  if (/http\s*5\d\d|status\s*5\d\d|500/i.test(raw)) {
    return "服务返回错误，请稍后重试或复制脱敏诊断。";
  }

  if (/fetch|network|failed to fetch|connection|connect|timeout|timed out|无法连接|服务不可达/i.test(raw)) {
    return "无法连接服务，请检查本机 chatlog 服务后重试。";
  }

  if (/chatlog\.json|parse|json|无法读取|无法解析|read|file|directory|目录|配置/i.test(raw)) {
    return "配置读取失败，请确认所选目录包含有效配置后重试。";
  }

  if (containsUnsafeDisplayText(raw)) {
    return fallback;
  }

  if (/http\s*\d{3}|status\s*\d{3}|\b[A-Z][A-Z0-9_]{3,}\b|undefined|null|error:/i.test(raw)) {
    return fallback;
  }

  return raw.trim() || fallback;
}

export function containsUnsafeDisplayText(value: string | null | undefined): boolean {
  if (!value) return false;
  return UNSAFE_DISPLAY_PATTERNS.some((pattern) => pattern.test(value));
}

function formatByteSummary(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value < 1024) return `${Math.round(value)} B`;

  const kib = value / 1024;
  if (kib < 1024) {
    return Number.isInteger(kib) ? `${kib} KB` : `${kib.toFixed(1)} KB`;
  }

  const mib = kib / 1024;
  return Number.isInteger(mib) ? `${mib} MB` : `${mib.toFixed(1)} MB`;
}
