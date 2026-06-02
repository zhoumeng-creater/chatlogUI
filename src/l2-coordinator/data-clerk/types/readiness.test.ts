import { describe, expect, it } from "vitest";
import { createReadinessState, getReadinessTone } from "./readiness";

describe("readiness state model", () => {
  it("creates a redaction-safe recoverable error state", () => {
    const state = createReadinessState({
      scope: "diagnostics",
      status: "error",
      title: "诊断导出失败",
      message: "无法完成敏感信息脱敏",
      recoveryAction: { label: "返回诊断面板", kind: "open-settings" },
      evidenceRef: "diag-redaction-failed",
      updatedAt: "2026-05-30T00:00:00.000Z",
    });

    expect(state.status).toBe("error");
    expect(state.recoveryAction?.kind).toBe("open-settings");
    expect(state.evidenceRef).toBe("diag-redaction-failed");
    expect(state.updatedAt).toBe("2026-05-30T00:00:00.000Z");
  });

  it("maps readiness statuses to the P2-C tone taxonomy", () => {
    expect(getReadinessTone("idle")).toBe("neutral");
    expect(getReadinessTone("loading")).toBe("info");
    expect(getReadinessTone("empty")).toBe("neutral");
    expect(getReadinessTone("success")).toBe("success");
    expect(getReadinessTone("error")).toBe("danger");
    expect(getReadinessTone("conflict")).toBe("warning");
    expect(getReadinessTone("cancelled")).toBe("neutral");
  });
});
