import type { SettingsState } from "@/l2-coordinator/api-docs/settings";

export interface SettingsValidationResult {
  valid: boolean;
  errors: string[];
}

export type UnsafeSettingsInput = Partial<SettingsState> & Record<string, unknown>;

export function sanitizeSettingsForStorage(input: Record<string, unknown>): Partial<SettingsState> {
  const rest = { ...input };
  delete rest.dataKey;
  delete rest.aiProvider;
  delete rest.aiEndpoint;
  delete rest.aiModel;
  delete rest.aiCredentialConfigured;
  delete rest.aiApiKey;
  delete rest.apiKey;
  delete rest.token;

  const sanitized = rest as Partial<SettingsState>;
  if (typeof rest.developerMode !== "boolean") {
    delete sanitized.developerMode;
  }

  return sanitized;
}

export function validateSettingsPatch(patch: Partial<SettingsState>): SettingsValidationResult {
  const errors: string[] = [];

  if (patch.sidecarPort !== undefined && (!Number.isInteger(patch.sidecarPort) || patch.sidecarPort <= 0)) {
    errors.push("服务端口必须是正整数。");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
