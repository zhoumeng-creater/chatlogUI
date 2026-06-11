import { describe, expect, it } from "vitest";
import {
  containsUnsafeDisplayText,
  formatConfiguredSecretState,
  formatExportPathSummary,
  formatLocalServiceDisplay,
  formatPrivatePathSummary,
  formatSafeUserFacingError,
} from "./privacyDisplay";

describe("privacyDisplay", () => {
  it("summarizes local paths without exposing user names, drive paths, or wxid values", () => {
    const summary = formatPrivatePathSummary(
      "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
      "data-dir",
    );

    expect(summary).toBe("已选择微信数据目录");
    expect(summary).not.toContain("C:\\");
    expect(summary).not.toContain("Synthetic");
    expect(summary).not.toContain("WeChat Files");
    expect(summary).not.toContain("wxid_synthetic_private");
  });

  it("falls back to a generic export success when the filename itself is unsafe", () => {
    expect(formatExportPathSummary("C:\\Users\\Synthetic\\Desktop\\diagnostics.json")).toBe(
      "diagnostics.json",
    );
    expect(formatExportPathSummary("C:\\Users\\Synthetic\\Desktop\\wxid_synthetic_private.json")).toBe(
      "诊断已导出",
    );
  });

  it("shows only loopback service origin and strips path, query, and hash", () => {
    const label = formatLocalServiceDisplay("http://127.0.0.1:6041/api/v1/db?dataKey=synthetic#frag");

    expect(label).toBe("本机服务 127.0.0.1:6041");
    expect(label).not.toContain("/api");
    expect(label).not.toContain("dataKey");
    expect(label).not.toContain("frag");
  });

  it("never reveals raw secret-like values in configured state summaries", () => {
    expect(formatConfiguredSecretState("sk-synthetic-redaction-token")).toBe("已配置");
    expect(formatConfiguredSecretState("")).toBe("未配置");
    expect(formatConfiguredSecretState(true)).toBe("已配置");
    expect(formatConfiguredSecretState(false)).toBe("未配置");
  });

  it("translates raw errors into ordinary user-facing recovery copy", () => {
    const error = formatSafeUserFacingError(new Error("HTTP 500: C:\\Users\\Synthetic\\secret"));

    expect(error).toContain("服务返回错误");
    expect(error).toContain("复制脱敏诊断");
    expect(error).not.toContain("HTTP 500");
    expect(error).not.toContain("C:\\Users\\Synthetic");
  });

  it("does not pass through unknown HTTP or internal error copy", () => {
    const error = formatSafeUserFacingError(new Error("HTTP 404: internal route code CHATLOG_NOT_FOUND"));

    expect(error).toBe("操作失败，请重试或复制脱敏诊断。");
    expect(error).not.toContain("HTTP 404");
    expect(error).not.toContain("CHATLOG_NOT_FOUND");
  });

  it("detects values that should never be rendered in ordinary UI", () => {
    expect(containsUnsafeDisplayText("C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private")).toBe(true);
    expect(containsUnsafeDisplayText("C:\\Users\\Synthetic\\Documents\\diagnostics.json")).toBe(true);
    expect(containsUnsafeDisplayText("C:/Users/Synthetic/Documents/diagnostics.json")).toBe(true);
    expect(containsUnsafeDisplayText("api_key=sk-synthetic-redaction-token")).toBe(true);
    expect(containsUnsafeDisplayText("已选择微信数据目录")).toBe(false);
  });
});
