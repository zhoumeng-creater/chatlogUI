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
    expect("sidecarPort" in migrated).toBe(false);
  });

  it("removes legacy Settings AI fields and does not claim credentials are configured", () => {
    const migrated = migrateSettings({
      aiProvider: "glm",
      aiEndpoint: "https://synthetic-secret.example/v1",
      aiModel: "legacy-ui-model",
      aiApiKey: "sk-synthetic-redaction-token",
      aiCredentialConfigured: true,
    });

    expect("aiProvider" in migrated).toBe(false);
    expect("aiEndpoint" in migrated).toBe(false);
    expect("aiModel" in migrated).toBe(false);
    expect("aiApiKey" in migrated).toBe(false);
    expect("aiCredentialConfigured" in migrated).toBe(false);
  });

  it("returns empty object for non-object input", () => {
    expect(migrateSettings(null)).toEqual({});
    expect(migrateSettings(undefined)).toEqual({});
    expect(migrateSettings("string")).toEqual({});
  });

  it("preserves active Settings fields while dropping legacy AI fields", () => {
    const original = {
      aiProvider: "ollama",
      aiModel: "llama3",
      aiEndpoint: "http://localhost:11434",
      theme: "dark",
      fontSize: "large",
      privacyOn: true,
      dataKey: "secret",
      sidecarPort: 8080,
      password: "synthetic-password",
      secret: "synthetic-secret",
      accessToken: "synthetic-access-token",
    };

    const migrated = migrateSettings(original);

    expect("aiProvider" in migrated).toBe(false);
    expect("aiModel" in migrated).toBe(false);
    expect("aiEndpoint" in migrated).toBe(false);
    expect(migrated.theme).toBe("dark");
    expect(migrated.fontSize).toBe("large");
    expect(migrated.privacyOn).toBe(true);
    expect("sidecarPort" in migrated).toBe(false);
    expect("dataKey" in migrated).toBe(false);
    expect("password" in migrated).toBe(false);
    expect("secret" in migrated).toBe(false);
    expect("accessToken" in migrated).toBe(false);
  });

  it("defaults developer mode to false and preserves only boolean values", () => {
    expect(migrateSettings({}).developerMode).toBeUndefined();
    expect(migrateSettings({ developerMode: true }).developerMode).toBe(true);
    expect(migrateSettings({ developerMode: "true" }).developerMode).toBeUndefined();
  });
});
