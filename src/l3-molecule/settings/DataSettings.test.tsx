import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataSettings } from "./DataSettings";

describe("DataSettings", () => {
  it("renders a safe data path summary instead of the raw local path", () => {
    const html = renderToStaticMarkup(
      <DataSettings
        settings={{
          aiProvider: "ollama",
          aiModel: "",
          aiEndpoint: "http://localhost:11434",
          aiCredentialConfigured: false,
          theme: "system",
          fontSize: "medium",
          reduceAnimations: false,
          windowMaterial: "none",
          wxDataPath: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
          sidecarPort: 5030,
          privacyOn: true,
          developerMode: false,
        }}
        saveStatus="idle"
        saveMessage={null}
        onChooseDataDirectory={vi.fn(async () => undefined)}
      />,
    );

    expect(html).toContain("已选择微信数据目录");
    expect(html).not.toContain("C:\\");
    expect(html).not.toContain("WeChat Files");
    expect(html).not.toContain("wxid_synthetic_private");
  });

  it("keeps the data path field id unique when an action button is inline", () => {
    const html = renderToStaticMarkup(
      <DataSettings
        settings={{
          aiProvider: "ollama",
          aiModel: "",
          aiEndpoint: "http://localhost:11434",
          aiCredentialConfigured: false,
          theme: "system",
          fontSize: "medium",
          reduceAnimations: false,
          windowMaterial: "none",
          wxDataPath: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
          sidecarPort: 5030,
          privacyOn: false,
          developerMode: false,
        }}
        saveStatus="idle"
        saveMessage={null}
        onChooseDataDirectory={vi.fn(async () => undefined)}
      />,
    );

    expect(html.match(/id="settings-wx-path"/g)).toHaveLength(1);
  });
});
