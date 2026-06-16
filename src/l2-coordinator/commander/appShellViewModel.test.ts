import { describe, expect, it } from "vitest";
import { deriveAppShellView, type AppShellViewInput } from "./appShellViewModel";

describe("appShellViewModel", () => {
  it("exposes shell title, privacy, and material state without reading stores in L3", () => {
    expect(
      deriveAppShellView({
        title: "工作台",
        privacyOn: true,
        windowMaterial: "mica",
      }),
    ).toMatchObject({
      productName: "chatlogUI",
      title: "工作台",
      privacyOn: true,
      windowMaterial: "mica",
    });
  });

  it("defines localized window-control labels for the shell contract", () => {
    const view = deriveAppShellView({
      title: "工作台",
      privacyOn: false,
      windowMaterial: "none",
    });

    expect(view).toMatchObject({
      windowControls: {
        minimizeLabel: "最小化窗口",
        maximizeLabel: "最大化窗口",
        restoreLabel: "还原窗口",
        closeLabel: "关闭窗口",
        toggleMaximizeLabel: "最大化窗口",
        isMaximized: false,
      },
    });
  });

  it("does not expose the developer console action by default", () => {
    const view = deriveAppShellView({
      title: "工作台",
      privacyOn: false,
      windowMaterial: "none",
      developerConsoleVisible: false,
    });

    expect(view.developerConsoleAction).toBeNull();
  });

  it("exposes the developer console action only when the L2 policy allows it", () => {
    const view = deriveAppShellView({
      title: "工作台",
      privacyOn: false,
      windowMaterial: "none",
      developerConsoleVisible: true,
    });

    expect(view.developerConsoleAction).toEqual({
      label: "开发者控制台",
      tooltip: "打开开发者控制台",
    });
  });

  it("exposes a contextual shortcut help action in the shell contract", () => {
    const view = deriveAppShellView({
      title: "搜索",
      privacyOn: false,
      windowMaterial: "none",
    });

    expect(view.shortcutHelpAction).toEqual({
      label: "快捷键帮助",
      tooltip: "查看当前页面快捷键",
    });
  });

  it("uses the restore label when the shell view knows the window is maximized", () => {
    const input = {
      title: "工作台",
      privacyOn: false,
      windowMaterial: "none",
      isMaximized: true,
    } as AppShellViewInput & { isMaximized: boolean };

    expect(deriveAppShellView(input)).toMatchObject({
      windowControls: {
        toggleMaximizeLabel: "还原窗口",
        isMaximized: true,
      },
    });
  });
});
