import { describe, expect, it } from "vitest";
import {
  deriveSettingsAiSemanticSummary,
  deriveSettingsDataServiceSummary,
} from "./settingsConfigOwnership";

describe("settingsConfigOwnership", () => {
  it("summarizes semantic AI without exposing or using legacy UI model fields", () => {
    const view = deriveSettingsAiSemanticSummary({
      moduleKind: "setup_required",
      indexStatus: null,
      privacyOn: true,
      legacySettings: {
        aiProvider: "deepseek",
        aiEndpoint: "https://synthetic-secret.example/v1",
        aiModel: "legacy-ui-model",
        aiCredentialConfigured: true,
      },
    });

    expect(view.title).toBe("AI 与语义");
    expect(view.statusLabel).toBe("需要配置");
    expect(view.description).toContain("AI 工作台");
    expect(view.description).toContain("模型密钥");
    expect(view.legacyIgnoredLabel).not.toContain("Settings");
    expect(view.primaryAction).toEqual({
      label: "前往 AI 工作台配置",
      target: "/ai?source=settings&panel=semantic",
    });
    expect(JSON.stringify(view)).not.toContain("API Key");
    expect(JSON.stringify(view)).not.toContain("Settings");
    expect(JSON.stringify(view)).not.toContain("endpoint");
    expect(JSON.stringify(view)).not.toContain("base URL");
    expect(JSON.stringify(view)).not.toContain("https://synthetic-secret.example");
    expect(JSON.stringify(view)).not.toContain("legacy-ui-model");
    expect(view.legacyIgnored).toBe(true);
  });

  it("keeps data/service Settings as a safe Setup summary and not a second connection form", () => {
    const view = deriveSettingsDataServiceSummary({
      dataDir: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
      legacyWxDataPath: "E:\\Legacy\\WeChat Files\\wxid_synthetic_old_private",
      hasDataKey: true,
      serviceLabel: "本机服务 127.0.0.1:5030",
      mode: "managed",
      profileConfigured: true,
      httpReady: true,
      dbReady: false,
      privacyOn: true,
    });

    expect(view.title).toBe("数据与服务");
    expect(view.pathSummary).toBe("已选择微信数据目录");
    expect(view.serviceLabel).toBe("应用管理的本机聊天服务");
    expect(view.serviceStatusLabel).toBe("服务已连接，数据库尚未就绪");
    expect(view.decryptionKeyLabel).toBe("密钥已配置");
    expect(view.primaryAction).toEqual({
      label: "前往初始设置修复",
      target: "/",
    });
    expect(view.showIndependentBaseUrlForm).toBe(false);
    expect(JSON.stringify(view)).not.toContain("C:\\");
    expect(JSON.stringify(view)).not.toContain("E:\\");
    expect(JSON.stringify(view)).not.toContain("wxid_synthetic_private");
    expect(JSON.stringify(view)).not.toContain("wxid_synthetic_old_private");
    expect(JSON.stringify(view)).not.toContain("127.0.0.1");
    expect(JSON.stringify(view)).not.toContain("dataKey");
    expect(JSON.stringify(view)).not.toContain("Sidecar");
    expect(JSON.stringify(view)).not.toContain("HTTP");
  });

  it("uses Setup profile state instead of legacy Settings data path", () => {
    const view = deriveSettingsDataServiceSummary({
      dataDir: null,
      legacyWxDataPath: "E:\\Legacy\\WeChat Files\\wxid_synthetic_old_private",
      hasDataKey: false,
      serviceLabel: "本机服务 127.0.0.1:5030",
      mode: "managed",
      profileConfigured: false,
      httpReady: false,
      dbReady: false,
      privacyOn: true,
    });

    expect(view.pathSummary).toBe("未配置微信数据目录");
    expect(view.serviceLabel).toBe("本机聊天服务未配置");
    expect(view.decryptionKeyLabel).toBe("密钥未配置，请前往初始设置");
    expect(JSON.stringify(view)).not.toContain("E:\\");
    expect(JSON.stringify(view)).not.toContain("wxid_synthetic_old_private");
  });
});
