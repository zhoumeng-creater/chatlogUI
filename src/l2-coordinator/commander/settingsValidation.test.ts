import { describe, expect, it } from "vitest";
import { sanitizeSettingsForStorage, validateSettingsPatch } from "./settingsValidation";

describe("settings validation", () => {
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
});
