import { describe, expect, it } from "vitest";
import { settingsMessagesEn } from "./messages.en";
import { flattenMessageKeys, settingsMessagesZhCN } from "./messages.zh-CN";
import { getDisallowedDiagnosticTerms } from "./copyCatalog";

describe("settings messages", () => {
  it("keeps zh-CN and English message keys aligned", () => {
    expect(flattenMessageKeys(settingsMessagesEn).sort()).toEqual(
      flattenMessageKeys(settingsMessagesZhCN).sort(),
    );
  });

  it("contains the first-wave Settings copy keys", () => {
    expect(settingsMessagesZhCN.settings.title).toBe("设置");
    expect(settingsMessagesZhCN.settings.categories.data).toBe("数据与服务");
    expect(settingsMessagesZhCN.settings.appearance.material.vibrancy).toBe("macOS 视觉融合");
    expect(settingsMessagesZhCN.settings.appearance.material.mica).toBe("Windows 云母");
    expect(settingsMessagesZhCN.settings.appearance.material.acrylic).toBe("Windows 亚克力");
    expect(settingsMessagesZhCN.settings.appearance.material.none).toBe("不透明");
    expect(settingsMessagesZhCN.settings.data.primaryAction).toBe("前往初始设置修复");
    expect(settingsMessagesZhCN.settings.ai.legacyIgnored).not.toContain("Settings");
  });

  it("contains first-wave module namespaces beyond Settings", () => {
    expect(settingsMessagesZhCN.app.productName).toBe("chatlogUI");
    expect(settingsMessagesZhCN.setup.service.externalServiceOccupied).toContain("本机聊天服务");
    expect(settingsMessagesZhCN.workbench.gate.managedServiceNotStarted).toContain("本机聊天服务");
    expect(settingsMessagesZhCN.search.title).toBe("搜索");
    expect(settingsMessagesZhCN.stats.title).toBe("统计");
    expect(settingsMessagesZhCN.sns.title).toBe("朋友圈");
    expect(settingsMessagesZhCN.export.title).toBe("导出");
  });

  it("keeps ordinary Settings copy free of diagnostic-only terms", () => {
    const userCopy = [
      settingsMessagesZhCN.settings.data.description,
      settingsMessagesZhCN.settings.ai.description,
      settingsMessagesZhCN.settings.advanced.developerHint,
      settingsMessagesZhCN.settings.about.productDescription,
    ].join(" ");

    expect(getDisallowedDiagnosticTerms(userCopy)).toEqual([]);
  });

  it("keeps ordinary first-wave module copy free of diagnostic-only terms", () => {
    const ordinaryCopy = [
      settingsMessagesZhCN.setup,
      settingsMessagesZhCN.workbench,
      settingsMessagesZhCN.search,
      settingsMessagesZhCN.stats,
      settingsMessagesZhCN.sns,
      settingsMessagesZhCN.export,
    ].map((value) => JSON.stringify(value)).join(" ");

    expect(getDisallowedDiagnosticTerms(ordinaryCopy)).toEqual([]);
  });
});
