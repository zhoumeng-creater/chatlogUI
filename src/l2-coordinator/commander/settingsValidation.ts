import type {
  FontSize,
  SettingsState,
  ThemeMode,
  WindowMaterial,
} from "@/l2-coordinator/api-docs/settings";
import { settingsMessagesZhCN } from "./messages.zh-CN";

export interface SettingsValidationResult {
  valid: boolean;
  errors: string[];
}

export type UnsafeSettingsInput = Partial<SettingsState> & Record<string, unknown>;

export function sanitizeSettingsForStorage(input: Record<string, unknown>): Partial<SettingsState> {
  const sanitized: Partial<SettingsState> = {};

  if (isThemeMode(input.theme)) sanitized.theme = input.theme;
  if (isFontSize(input.fontSize)) sanitized.fontSize = input.fontSize;
  if (typeof input.reduceAnimations === "boolean") {
    sanitized.reduceAnimations = input.reduceAnimations;
  }
  if (isWindowMaterial(input.windowMaterial)) {
    sanitized.windowMaterial = input.windowMaterial;
  }
  if (typeof input.wxDataPath === "string") sanitized.wxDataPath = input.wxDataPath;
  if (typeof input.privacyOn === "boolean") sanitized.privacyOn = input.privacyOn;
  if (typeof input.developerMode === "boolean") sanitized.developerMode = input.developerMode;

  return sanitized;
}

export function validateSettingsPatch(patch: UnsafeSettingsInput): SettingsValidationResult {
  const errors: string[] = [];

  if ("theme" in patch && !isThemeMode(patch.theme)) {
    errors.push(settingsMessagesZhCN.settings.validation.theme);
  }
  if ("fontSize" in patch && !isFontSize(patch.fontSize)) {
    errors.push(settingsMessagesZhCN.settings.validation.fontSize);
  }
  if ("reduceAnimations" in patch && typeof patch.reduceAnimations !== "boolean") {
    errors.push(settingsMessagesZhCN.settings.validation.reduceAnimations);
  }
  if ("windowMaterial" in patch && !isWindowMaterial(patch.windowMaterial)) {
    errors.push(settingsMessagesZhCN.settings.validation.windowMaterial);
  }
  if ("privacyOn" in patch && typeof patch.privacyOn !== "boolean") {
    errors.push(settingsMessagesZhCN.settings.validation.privacyOn);
  }
  if ("developerMode" in patch && typeof patch.developerMode !== "boolean") {
    errors.push(settingsMessagesZhCN.settings.validation.developerMode);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function isFontSize(value: unknown): value is FontSize {
  return value === "small" || value === "medium" || value === "large";
}

function isWindowMaterial(value: unknown): value is WindowMaterial {
  return value === "vibrancy" || value === "mica" || value === "acrylic" || value === "none";
}
