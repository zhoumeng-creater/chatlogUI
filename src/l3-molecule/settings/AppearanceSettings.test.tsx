import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppearanceSettings } from "./AppearanceSettings";

describe("AppearanceSettings", () => {
  it("renders all supported material labels with platform-accurate names", () => {
    const html = renderToStaticMarkup(
      <AppearanceSettings
        copy={appearanceCopy}
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

    expect(html).toContain("macOS 视觉融合");
    expect(html).toContain("Windows 云母");
    expect(html).toContain("Windows 亚克力");
    expect(html).toContain("不透明");
    expect(html).not.toContain("亚克力材质");
  });
});

const appearanceCopy = {
  title: "外观",
  theme: {
    label: "主题",
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
  },
  fontSize: {
    label: "字体大小",
    small: "小",
    medium: "中",
    large: "大",
  },
  material: {
    label: "窗口材质",
    vibrancy: "macOS 视觉融合",
    mica: "Windows 云母",
    acrylic: "Windows 亚克力",
    none: "不透明",
  },
  motion: {
    label: "动画效果",
    full: "标准",
    reduced: "减少",
  },
};
