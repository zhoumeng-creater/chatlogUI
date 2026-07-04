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
      httpAddr: expect.stringContaining("本机"),
    });
    expect(result.fieldErrors.dataKey).toBeUndefined();
    expect(result.fieldErrors.platform).toBeUndefined();
    expect(result.fieldErrors.fullVersion).toBeUndefined();
    expect(result.fieldErrors.version).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("example.com/api");
    expect(JSON.stringify(result)).not.toContain("sk-synthetic-secret");
  });

  it("asks for a key override only after a data directory is present but key import failed", () => {
    const result = deriveManualConfigValidationView({
      dataDir: "C:\\Synthetic\\WeChat Files",
      workDir: "",
      platform: "",
      version: 0,
      fullVersion: "",
      dataKey: "",
      imgKey: "",
      httpAddr: "127.0.0.1:5030",
      saveDecryptedMedia: true,
    } satisfies ServerConfigDraft);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors.dataDir).toBeUndefined();
    expect(result.fieldErrors.dataKey).toContain("密钥手动覆盖");
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

  it("maps hidden version metadata errors back to the selected data directory", () => {
    const result = mapConfigValidationErrorsToManualFields([
      {
        code: "full_version_required",
        field: "full_version",
        message: "需要完整微信版本号，例如 4.1.8.107",
      },
      {
        code: "version_required",
        field: "version",
        message: "需要微信主版本号，例如 4",
      },
    ] satisfies ConfigValidationError[]);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors.dataDir).toContain("目录配置不完整");
    expect(result.fieldErrors.fullVersion).toBeUndefined();
    expect(result.fieldErrors.version).toBeUndefined();
  });
});
