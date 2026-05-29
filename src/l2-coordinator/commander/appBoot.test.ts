import { describe, expect, it } from "vitest";
import { resolveBootDataPath } from "./appBoot";

describe("resolveBootDataPath", () => {
  it("prefers a persisted settings path over detected candidates", () => {
    const result = resolveBootDataPath({
      settingsPath: "  C:/WeChat Files/wxid_saved  ",
      candidates: [
        { path: "C:/WeChat Files/wxid_detected", label: "detected", exists: true },
      ],
    });

    expect(result).toBe("C:/WeChat Files/wxid_saved");
  });

  it("uses the first detected candidate when no settings path exists", () => {
    const result = resolveBootDataPath({
      settingsPath: "",
      candidates: [
        { path: "C:/WeChat Files/wxid_detected", label: "detected", exists: true },
      ],
    });

    expect(result).toBe("C:/WeChat Files/wxid_detected");
  });

  it("returns null when no data path is available", () => {
    const result = resolveBootDataPath({
      settingsPath: "",
      candidates: [],
    });

    expect(result).toBeNull();
  });
});
