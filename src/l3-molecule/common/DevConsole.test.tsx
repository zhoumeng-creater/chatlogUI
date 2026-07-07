import { describe, expect, it } from "vitest";
import {
  formatDevConsoleExportStatus,
  getDevConsolePrivacyNotice,
  getDevConsoleSourceLabel,
} from "./DevConsole";
import devConsoleSource from "./DevConsole.tsx?raw";

describe("DevConsole", () => {
  it("formats export success without leaking the full filesystem path", () => {
    const message = formatDevConsoleExportStatus("C:\\Users\\Synthetic\\Desktop\\diagnostics.json");

    expect(message).toContain("diagnostics.json");
    expect(message).not.toContain("C:\\");
    expect(message).not.toContain("Users");
    expect(message).not.toContain("Synthetic");
  });

  it("falls closed when export path is missing or unsafe", () => {
    expect(formatDevConsoleExportStatus(null)).toBe("诊断导出失败，请检查脱敏状态。");
    expect(formatDevConsoleExportStatus("C:\\Users\\Synthetic\\Desktop\\wxid_synthetic_private.json")).toBe(
      "诊断已导出",
    );
  });

  it("labels local UX KPI events separately from UI diagnostics", () => {
    expect(getDevConsoleSourceLabel("ux")).toBe("UX KPI");
    expect(getDevConsoleSourceLabel("ui")).toBe("UI");
  });

  it("explains that UX KPI diagnostics stay local and redacted", () => {
    expect(getDevConsolePrivacyNotice()).toBe(
      "UX KPI 仅记录在本机内存；诊断导出继续受脱敏检查保护。",
    );
  });

  it("uses the shared Select atom for every diagnostic dropdown", () => {
    expect(devConsoleSource).not.toContain("<select");
    expect(devConsoleSource.match(/<Select/g) ?? []).toHaveLength(5);
  });
});
