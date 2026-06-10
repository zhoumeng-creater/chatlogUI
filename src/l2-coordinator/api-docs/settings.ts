export type ThemeMode = "system" | "light" | "dark";
export type WindowMaterial = "vibrancy" | "mica" | "acrylic" | "none";
export type SettingsCategory = "ai" | "appearance" | "data" | "advanced" | "about";
export type FontSize = "small" | "medium" | "large";

export interface SettingsState {
  aiProvider: string;
  aiModel: string;
  aiEndpoint: string;
  aiCredentialConfigured: boolean;
  theme: ThemeMode;
  fontSize: FontSize;
  reduceAnimations: boolean;
  windowMaterial: WindowMaterial;
  wxDataPath: string;
  sidecarPort: number;
  privacyOn: boolean;
  developerMode: boolean;
}

export const SETTINGS_DEFAULTS: SettingsState = {
  aiProvider: "ollama",
  aiModel: "",
  aiEndpoint: "http://localhost:11434",
  aiCredentialConfigured: false,
  theme: "system",
  fontSize: "medium",
  reduceAnimations: false,
  windowMaterial: "none",
  wxDataPath: "",
  sidecarPort: 5030,
  privacyOn: false,
  developerMode: false,
};
