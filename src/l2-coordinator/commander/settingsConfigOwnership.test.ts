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
    expect(view.primaryAction).toEqual({
      label: "前往 AI 工作台配置",
      target: "/ai?source=settings&panel=semantic",
    });
    expect(JSON.stringify(view)).not.toContain("https://synthetic-secret.example");
    expect(JSON.stringify(view)).not.toContain("legacy-ui-model");
    expect(view.legacyIgnored).toBe(true);
  });

  it("keeps data/service Settings as a safe Setup summary and not a second connection form", () => {
    const view = deriveSettingsDataServiceSummary({
      wxDataPath: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
      serviceLabel: "本机服务 127.0.0.1:5030",
      mode: "managed",
      httpReady: true,
      dbReady: false,
      privacyOn: true,
    });

    expect(view.title).toBe("数据与服务");
    expect(view.pathSummary).toBe("已选择微信数据目录");
    expect(view.serviceLabel).toBe("应用管理的本机服务");
    expect(view.serviceStatusLabel).toBe("服务已连接，数据库尚未就绪");
    expect(view.primaryAction).toEqual({
      label: "前往设置中心修改",
      target: "/",
    });
    expect(view.showIndependentBaseUrlForm).toBe(false);
    expect(JSON.stringify(view)).not.toContain("C:\\");
    expect(JSON.stringify(view)).not.toContain("wxid_synthetic_private");
    expect(JSON.stringify(view)).not.toContain("127.0.0.1");
    expect(JSON.stringify(view)).not.toContain("dataKey");
  });
});
