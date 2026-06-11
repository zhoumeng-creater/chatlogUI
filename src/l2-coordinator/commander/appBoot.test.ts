import { describe, expect, it } from "vitest";
import { resolveBootDataPath } from "./appBoot";

describe("resolveBootDataPath", () => {
  it("prefers a persisted settings path over detected candidates", () => {
    const result = resolveBootDataPath({
      settingsPath: "  C:/Synthetic/WeChat Files/wxid_synthetic_saved  ",
      candidates: [
        { path: "C:/Synthetic/WeChat Files/wxid_synthetic_detected", label: "detected", exists: true, source: "test", confidence: "high" },
      ],
    });

    expect(result).toBe("C:/Synthetic/WeChat Files/wxid_synthetic_saved");
  });

  it("uses the first detected candidate when no settings path exists", () => {
    const result = resolveBootDataPath({
      settingsPath: "",
      candidates: [
        { path: "C:/Synthetic/WeChat Files/wxid_synthetic_detected", label: "detected", exists: true, source: "test", confidence: "high" },
      ],
    });

    expect(result).toBe("C:/Synthetic/WeChat Files/wxid_synthetic_detected");
  });

  it("returns null when no data path is available", () => {
    const result = resolveBootDataPath({
      settingsPath: "",
      candidates: [],
    });

    expect(result).toBeNull();
  });
});
