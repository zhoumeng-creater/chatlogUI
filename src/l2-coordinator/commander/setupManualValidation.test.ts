import { describe, expect, it } from "vitest";
import type { ConfigValidationError, ServerConfigDraft } from "@l4/system";
import {
  deriveManualConfigValidationView,
  mapConfigValidationErrorsToManualFields,
} from "./setupManualValidation";

describe("setup manual validation", () => {
  it("returns field-level errors before starting service checks", () => {
    const result = deriveManualConfigValidationView({
      dataDir: "",
      workDir: "",
      platform: "",
      version: 0,
      fullVersion: "",
      dataKey: "",
      imgKey: "",
      httpAddr: "https://example.com/api/v1/db?token=sk-synthetic-secret",
      saveDecryptedMedia: true,
    } satisfies ServerConfigDraft);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors).toMatchObject({
      dataDir: expect.stringContaining("数据目录"),
      platform: expect.stringContaining("平台"),
      fullVersion: expect.stringContaining("完整版本"),
      dataKey: expect.stringContaining("Data Key"),
      httpAddr: expect.stringContaining("本机"),
    });
    expect(JSON.stringify(result)).not.toContain("example.com/api");
    expect(JSON.stringify(result)).not.toContain("sk-synthetic-secret");
  });

  it("maps backend validation errors to safe field messages and an aggregate summary", () => {
    const result = mapConfigValidationErrorsToManualFields([
      {
        code: "missing_data_dir",
        field: "data_dir",
        message: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private 不存在",
      },
      {
        code: "invalid_http_addr",
        field: "http_addr",
        message: "服务地址只填写 origin，不要包含路径、查询参数或片段",
      },
    ] satisfies ConfigValidationError[]);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors.dataDir).toBe("配置读取失败，请确认所选目录包含有效配置后重试。");
    expect(result.fieldErrors.httpAddr).toContain("origin");
    expect(result.summary).toContain("请检查 2 个字段");
    expect(JSON.stringify(result)).not.toContain("C:\\Users\\Synthetic");
    expect(JSON.stringify(result)).not.toContain("wxid_synthetic_private");
  });
});
