import { describe, expect, it } from "vitest";
import {
  getCredentialStatusText,
  getIndexMetricValue,
  getSafeSemanticDiagnosticText,
  getSafeSemanticEndpointLabel,
} from "./semanticSetupDisplay";
import { containsSensitiveDiagnosticText } from "@/utils/maskSecrets";

describe("semantic setup display helpers", () => {
  it("shows stable credential labels without exposing keys", () => {
    expect(getCredentialStatusText({ state: "retain_saved", label: "留空将保留已保存 key", tone: "success" })).toBe(
      "留空将保留已保存 key",
    );
    expect(getCredentialStatusText({ state: "will_update", label: "本次将更新", tone: "info" })).not.toContain("sk-");
  });

  it("hides URL host and path in privacy mode", () => {
    const hidden = getSafeSemanticEndpointLabel("https://api.deepseek.com/chat/completions?token=secret", true);

    expect(hidden).toBe("https://已隐藏");
    expect(hidden).not.toContain("api.deepseek.com");
    expect(hidden).not.toContain("token");
    expect(getSafeSemanticEndpointLabel("127.0.0.1:11434", true)).toBe("已隐藏");
  });

  it("keeps metric fallback text stable", () => {
    expect(getIndexMetricValue("")).toBe("无");
    expect(getIndexMetricValue("90/min")).toBe("90/min");
  });

  it("redacts sensitive diagnostic text before semantic setup surfaces render it", () => {
    const message = getSafeSemanticDiagnosticText(
      "api_key=sk-synthetic-redaction-token token=raw-token message: synthetic-private-message C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_real",
    );

    expect(message).not.toContain("sk-synthetic-redaction-token");
    expect(message).not.toContain("raw-token");
    expect(message).not.toContain("synthetic-private-message");
    expect(message).not.toContain("Alice");
    expect(message).not.toContain("wxid_synthetic_real");
    expect(containsSensitiveDiagnosticText(message)).toBe(false);
  });
});
