export type ThemeMode = "system" | "light" | "dark";
export type WindowMaterial = "vibrancy" | "mica" | "acrylic" | "none";
export type SettingsCategory = "ai" | "appearance" | "data" | "about";
export type FontSize = "small" | "medium" | "large";

export interface SettingsState {
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiApiKey: string;
  theme: ThemeMode;
  fontSize: FontSize;
  reduceAnimations: boolean;
  windowMaterial: WindowMaterial;
  wxDataPath: string;
  dataKey: string;
  sidecarPort: number;
  privacyOn: boolean;
}

export const SETTINGS_DEFAULTS: SettingsState = {
  aiProvider: "ollama",
  aiModel: "",
  aiEndpoint: "http://localhost:11434",
  aiApiKey: "",
  theme: "system",
  fontSize: "medium",
  reduceAnimations: false,
  windowMaterial: "none",
  wxDataPath: "",
  dataKey: "",
  sidecarPort: 5030,
  privacyOn: false,
};
