import { describe, expect, it } from "vitest";
import { formatDevConsoleExportStatus } from "./DevConsole";

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
});
