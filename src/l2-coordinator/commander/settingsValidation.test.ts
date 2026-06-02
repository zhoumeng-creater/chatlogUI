import { describe, expect, it } from "vitest";
import { sanitizeSettingsForStorage, validateSettingsPatch } from "./settingsValidation";

describe("settings validation", () => {
  it("strips UI-stored credentials and resets credential state", () => {
    const sanitized = sanitizeSettingsForStorage({
      aiProvider: "glm",
      aiApiKey: "sk-secret",
      aiCredentialConfigured: true,
      wxDataPath: "E:/WeChat",
    });

    expect("aiApiKey" in sanitized).toBe(false);
    expect(sanitized.aiCredentialConfigured).toBe(false);
    expect(sanitized.wxDataPath).toBe("E:/WeChat");
  });

  it("rejects invalid AI endpoints before saving", () => {
    const result = validateSettingsPatch({ aiEndpoint: "not-a-url" });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("API 端点");
  });
});
