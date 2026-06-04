import type { SemanticCredentialState } from "@l2/commander/semanticSetupViewModel";
import { maskDiagnosticText } from "@/utils/maskSecrets";

export function getCredentialStatusText(state: SemanticCredentialState): string {
  return state.label;
}

export function getSafeSemanticEndpointLabel(value: string, privacyOn: boolean): string {
  const trimmed = value.trim();
  if (!trimmed) return "未配置";
  if (!privacyOn) return trimmed;

  try {
    const url = new URL(trimmed);
    return `${url.protocol}//已隐藏`;
  } catch {
    return "已隐藏";
  }
}

export function getIndexMetricValue(value: string): string {
  return value.trim() || "无";
}

export function getSafeSemanticDiagnosticText(value: string): string {
  const safe = maskDiagnosticText(value, { privacyMode: true }).trim();
  return safe || "操作失败，请检查配置后重试。";
}
