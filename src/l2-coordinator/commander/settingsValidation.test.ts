import { describe, expect, it } from "vitest";
import { sanitizeSettingsForStorage, validateSettingsPatch } from "./settingsValidation";

describe("settings validation", () => {
  it("accepts valid Settings-owned preferences", () => {
    const result = validateSettingsPatch({
      theme: "dark",
      fontSize: "large",
      reduceAnimations: true,
      windowMaterial: "acrylic",
      privacyOn: true,
      developerMode: true,
    });

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects invalid values for every Settings-owned preference with user-facing copy", () => {
    const result = validateSettingsPatch({
      theme: "sepia",
      fontSize: "huge",
      reduceAnimations: "yes",
      windowMaterial: "glass",
      privacyOn: "true",
      developerMode: "false",
    } as never);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "主题只能选择跟随系统、浅色或深色。",
      "字体大小只能选择小、中或大。",
      "动画偏好只能保存为开启或减少。",
      "窗口材质只能选择 macOS 视觉融合、Windows 云母、Windows 亚克力或不透明。",
      "隐私模式只能保存为开启或关闭。",
      "开发者工具入口只能保存为显示或隐藏。",
    ]);
    expect(result.errors.join(" ")).not.toContain("theme");
    expect(result.errors.join(" ")).not.toContain("fontSize");
    expect(result.errors.join(" ")).not.toContain("windowMaterial");
  });

  it("strips UI-stored credentials and resets credential state", () => {
    const sanitized = sanitizeSettingsForStorage({
      aiProvider: "glm",
      aiEndpoint: "https://synthetic-secret.example/v1",
      aiModel: "legacy-ui-model",
      aiApiKey: "sk-synthetic-redaction-token",
      aiCredentialConfigured: true,
      wxDataPath: "E:/WeChat",
    });

    expect("aiProvider" in sanitized).toBe(false);
    expect("aiEndpoint" in sanitized).toBe(false);
    expect("aiModel" in sanitized).toBe(false);
    expect("aiApiKey" in sanitized).toBe(false);
    expect("aiCredentialConfigured" in sanitized).toBe(false);
    expect(sanitized.wxDataPath).toBe("E:/WeChat");
  });

  it("ignores legacy AI endpoint patches because semantic config belongs to AI workspace", () => {
    const result = validateSettingsPatch({ aiEndpoint: "not-a-url" } as never);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("persists Settings with an explicit allowlist instead of keeping unknown secret-like fields", () => {
    const sanitized = sanitizeSettingsForStorage({
      theme: "dark",
      fontSize: "large",
      reduceAnimations: true,
      windowMaterial: "mica",
      wxDataPath: "E:/WeChat",
      privacyOn: true,
      developerMode: true,
      password: "synthetic-password",
      secret: "synthetic-secret",
      accessToken: "synthetic-access-token",
      authorization: "Bearer synthetic",
      credential: "synthetic-credential",
      privateKey: "synthetic-private-key",
      sidecarPort: 8080,
    });

    expect(sanitized).toEqual({
      theme: "dark",
      fontSize: "large",
      reduceAnimations: true,
      windowMaterial: "mica",
      wxDataPath: "E:/WeChat",
      privacyOn: true,
      developerMode: true,
    });
  });

  it("ignores legacy sidecar port patches because service ownership belongs to Setup", () => {
    const result = validateSettingsPatch({ sidecarPort: 0 } as never);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("does not persist invalid known preference values while sanitizing legacy objects", () => {
    const sanitized = sanitizeSettingsForStorage({
      theme: "sepia",
      fontSize: "giant",
      reduceAnimations: "yes",
      windowMaterial: "glass",
      privacyOn: "true",
      developerMode: "false",
      aiApiKey: "sk-synthetic-redaction-token",
      sidecarPort: 5030,
    });

    expect(sanitized).toEqual({});
  });
});
