import { describe, expect, it } from "vitest";
import { toApiErrorModel } from "./errorTranslator";
import { toUserFacingError } from "./userFacingError";

describe("userFacingError", () => {
  it("maps API error families to action-oriented copy", () => {
    const model = toApiErrorModel(new Error("fetch failed ECONNREFUSED http://127.0.0.1:5030/api/v1/search"));
    const error = toUserFacingError(model, { contextLabel: "搜索" });

    expect(error.title).toBe("搜索不可用");
    expect(error.reason).toContain("无法连接本机服务");
    expect(error.actions).toContain("检查服务状态");
    expect(error.actions).toContain("重试当前操作");
    expect(error.retryable).toBe(true);
    expect(error.diagnosticFamily).toBe("network");
  });

  it("never places raw private diagnostics in visible or copyable text", () => {
    const model = toApiErrorModel(
      new Error(
        'requestBody={"query":"synthetic-private-message","dataKey":"secret123","chat":"wxid_synthetic_private"} path=C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private\\MSG.db',
      ),
    );
    const error = toUserFacingError(model, { contextLabel: "导出" });
    const combined = [
      error.title,
      error.reason,
      error.summary,
      error.copyDiagnostics,
      ...error.actions,
    ].join("\n");

    expect(combined).not.toContain("synthetic-private-message");
    expect(combined).not.toContain("secret123");
    expect(combined).not.toContain("C:\\Users\\Synthetic");
    expect(combined).not.toContain("wxid_synthetic_private");
    expect(error.copyDiagnostics).toContain("[redacted");
    expect(error.actions.length).toBeGreaterThan(0);
  });
});
