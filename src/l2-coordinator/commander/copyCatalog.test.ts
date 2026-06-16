import { describe, expect, it } from "vitest";
import {
  COPY_CATALOG,
  PRIVACY_COPY_RULES,
  getDisallowedDiagnosticTerms,
  isDiagnosticTermAllowed,
} from "./copyCatalog";

describe("copyCatalog", () => {
  it("separates user terms from diagnostic terms", () => {
    expect(COPY_CATALOG.user.localChatService.label).toBe("本机聊天服务");
    expect(COPY_CATALOG.user.dataDirectory.label).toBe("数据目录");
    expect(COPY_CATALOG.user.privacyMode.label).toBe("隐私模式");
    expect(COPY_CATALOG.diagnostic.sidecar.label).toBe("Sidecar");
    expect(COPY_CATALOG.diagnostic.dataKey.label).toBe("Data Key");
  });

  it("blocks diagnostic-only terms from ordinary user copy", () => {
    expect(getDisallowedDiagnosticTerms("本机聊天服务已经连接，数据库已就绪。")).toEqual([]);
    expect(getDisallowedDiagnosticTerms("HTTP endpoint and Sidecar Data Key are visible")).toEqual([
      "Sidecar",
      "HTTP",
      "endpoint",
      "Data Key",
    ]);
  });

  it("allows diagnostic terms only in about, diagnostics, and developer contexts", () => {
    expect(isDiagnosticTermAllowed("Sidecar", "settings-user")).toBe(false);
    expect(isDiagnosticTermAllowed("Sidecar", "about")).toBe(true);
    expect(isDiagnosticTermAllowed("HTTP", "diagnostics")).toBe(true);
    expect(isDiagnosticTermAllowed("Data Key", "developer")).toBe(true);
  });

  it("documents privacy copy rules for every outward-facing surface", () => {
    expect(Object.keys(PRIVACY_COPY_RULES).sort()).toEqual([
      "aria",
      "copy",
      "diagnostics",
      "export",
      "screenshot",
      "tooltip",
      "visible",
    ]);
    expect(PRIVACY_COPY_RULES.visible.redacts).toContain("private-labels");
    expect(PRIVACY_COPY_RULES.aria.redacts).toContain("private-labels");
    expect(PRIVACY_COPY_RULES.copy.redacts).toContain("raw-local-paths");
    expect(PRIVACY_COPY_RULES.export.redacts).toContain("tokens");
    expect(PRIVACY_COPY_RULES.diagnostics.allowedStructure).toContain("readiness");
    expect(PRIVACY_COPY_RULES.screenshot.allowedStructure).toContain("counts");
  });
});
