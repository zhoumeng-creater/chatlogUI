import { describe, expect, it } from "vitest";
import { migrateSettings } from "./useSettingsStore";

describe("migrateSettings", () => {
  it("removes persisted dataKey from browser settings", () => {
    const migrated = migrateSettings({
      wxDataPath: "E:/WeChat",
      dataKey: "a".repeat(64),
      sidecarPort: 5030,
    });

    expect("dataKey" in migrated).toBe(false);
    expect(migrated.wxDataPath).toBe("E:/WeChat");
    expect(migrated.sidecarPort).toBe(5030);
  });

  it("removes persisted AI API keys and does not claim credentials are configured", () => {
    const migrated = migrateSettings({
      aiProvider: "glm",
      aiApiKey: "sk-secret",
      aiCredentialConfigured: true,
    });

    expect("aiApiKey" in migrated).toBe(false);
    expect(migrated.aiCredentialConfigured).toBe(false);
  });

  it("returns empty object for non-object input", () => {
    expect(migrateSettings(null)).toEqual({});
    expect(migrateSettings(undefined)).toEqual({});
    expect(migrateSettings("string")).toEqual({});
  });

  it("preserves all other fields intact", () => {
    const original = {
      aiProvider: "ollama",
      aiModel: "llama3",
      theme: "dark",
      fontSize: "large",
      privacyOn: true,
      dataKey: "secret",
      sidecarPort: 8080,
    };

    const migrated = migrateSettings(original);

    expect(migrated.aiProvider).toBe("ollama");
    expect(migrated.aiModel).toBe("llama3");
    expect(migrated.theme).toBe("dark");
    expect(migrated.fontSize).toBe("large");
    expect(migrated.privacyOn).toBe(true);
    expect(migrated.sidecarPort).toBe(8080);
    expect("dataKey" in migrated).toBe(false);
  });
});
