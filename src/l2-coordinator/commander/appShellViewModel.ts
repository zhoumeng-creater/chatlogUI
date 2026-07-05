import type { WindowMaterial } from "@l2/api-docs/settings";
import { settingsMessagesZhCN } from "./messages.zh-CN";

export interface AppShellViewInput {
  title: string;
  privacyOn: boolean;
  windowMaterial: WindowMaterial;
  isMaximized?: boolean;
  developerConsoleVisible?: boolean;
}

export interface AppShellWindowControlsView {
  minimizeLabel: string;
  maximizeLabel: string;
  restoreLabel: string;
  closeLabel: string;
  toggleMaximizeLabel: string;
  isMaximized: boolean;
}

export interface AppShellView {
  productName: string;
  title: string;
  privacyOn: boolean;
  windowMaterial: WindowMaterial;
  shortcutHelpAction: {
    label: string;
    tooltip: string;
  };
  developerConsoleAction: {
    label: string;
    tooltip: string;
  } | null;
  windowControls: AppShellWindowControlsView;
}

export function deriveAppShellView(input: AppShellViewInput): AppShellView {
  const isMaximized = input.isMaximized ?? false;

  return {
    productName: settingsMessagesZhCN.app.productName,
    title: input.title,
    privacyOn: input.privacyOn,
    windowMaterial: input.windowMaterial,
    shortcutHelpAction: {
      label: "页面帮助",
      tooltip: "查看当前页面说明",
    },
    developerConsoleAction: input.developerConsoleVisible
      ? {
          label: "开发者控制台",
          tooltip: "打开开发者控制台",
        }
      : null,
    windowControls: {
      minimizeLabel: "最小化窗口",
      maximizeLabel: "最大化窗口",
      restoreLabel: "还原窗口",
      closeLabel: "关闭窗口",
      toggleMaximizeLabel: isMaximized ? "还原窗口" : "最大化窗口",
      isMaximized,
    },
  };
}
