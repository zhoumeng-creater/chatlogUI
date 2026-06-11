export type ThemeMode = "system" | "light" | "dark";
export type WindowMaterial = "vibrancy" | "mica" | "acrylic" | "none";
export type SettingsCategory = "ai" | "appearance" | "data" | "advanced" | "about";
export type FontSize = "small" | "medium" | "large";

export interface SettingsState {
  theme: ThemeMode;
  fontSize: FontSize;
  reduceAnimations: boolean;
  windowMaterial: WindowMaterial;
  wxDataPath: string;
  privacyOn: boolean;
  developerMode: boolean;
}

export const SETTINGS_DEFAULTS: SettingsState = {
  theme: "system",
  fontSize: "medium",
  reduceAnimations: false,
  windowMaterial: "none",
  wxDataPath: "",
  privacyOn: false,
  developerMode: false,
};
