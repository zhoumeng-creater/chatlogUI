import { describe, expect, it } from "vitest";
import { deriveAppShellView } from "./appShellViewModel";

describe("appShellViewModel", () => {
  it("exposes shell title, privacy, and material state without reading stores in L3", () => {
    expect(
      deriveAppShellView({
        title: "工作台",
        privacyOn: true,
        windowMaterial: "mica",
      }),
    ).toEqual({
      title: "工作台",
      privacyOn: true,
      windowMaterial: "mica",
    });
  });
});
