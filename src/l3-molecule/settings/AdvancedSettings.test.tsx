import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdvancedSettings } from "./AdvancedSettings";

describe("AdvancedSettings", () => {
  it("uses the same privacy and diagnostics label as the Settings navigation", () => {
    const html = renderToStaticMarkup(
      <AdvancedSettings
        settings={{
          theme: "system",
          fontSize: "medium",
          reduceAnimations: false,
          windowMaterial: "none",
          wxDataPath: "",
          privacyOn: false,
          developerMode: false,
        }}
        saveStatus="idle"
        saveMessage={null}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain("隐私与诊断");
    expect(html).not.toContain("高级诊断</");
  });
});
