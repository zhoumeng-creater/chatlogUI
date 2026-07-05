import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import overlaySource from "./ShortcutHelpOverlay.tsx?raw";
import { ShortcutHelpOverlay } from "./ShortcutHelpOverlay";
import type { ShortcutHelpCatalog } from "@l2/commander/shortcutCatalog";

describe("ShortcutHelpOverlay", () => {
  it("renders contextual page help with shortcut groups as a modal without private text", () => {
    const html = renderToStaticMarkup(
      <ShortcutHelpOverlay
        catalog={catalog()}
        open
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("搜索帮助");
    expect(html).toContain("页面说明");
    expect(html).toContain("搜索页用于在聊天数据中查找关键词");
    expect(html).toContain("快捷键");
    expect(html).toContain("执行搜索");
    expect(html).toContain("Ctrl / ⌘ + /");
    expect(html).not.toContain("Synthetic Private Query");
  });

  it("uses a single close affordance without showing a close tooltip", () => {
    expect(overlaySource).toContain('aria-label="关闭帮助"');
    expect(overlaySource).not.toContain("<IconButton");
    expect(overlaySource).not.toContain('tooltip="关闭快捷键帮助"');
    expect(overlaySource).not.toContain("shortcut-help-overlay__footer");
  });

  it("uses the shared overlay focus helpers", () => {
    expect(overlaySource).toContain("focusInitialOverlayTarget");
    expect(overlaySource).toContain("restoreFocusTarget");
    expect(overlaySource).toContain("shouldCloseOverlayOnKey");
    expect(overlaySource).toContain("trapOverlayFocus");
  });
});

function catalog(): ShortcutHelpCatalog {
  return {
    contextId: "search",
    title: "搜索帮助",
    description: "查看当前页面说明、主要操作和可用快捷键。",
    overview: {
      title: "搜索聊天记录",
      description: "搜索页用于在聊天数据中查找关键词，并通过筛选、结果列表和上下文跳转定位原始消息。",
      items: [
        "先输入关键词，再按需要切换会话范围、时间或消息类型筛选。",
        "搜索结果只显示必要摘要，隐私模式开启时会保留结构并遮罩具体内容。",
      ],
    },
    groups: [
      {
        id: "global",
        label: "全局",
        shortcuts: [
          {
            id: "help",
            keyLabel: "?",
            alternativeKeyLabel: "Ctrl / ⌘ + /",
            actionLabel: "打开页面帮助",
            description: "显示当前页面说明和可用快捷键。",
            enabled: true,
            disabledReason: null,
          },
        ],
      },
      {
        id: "search",
        label: "搜索",
        shortcuts: [
          {
            id: "search-execute",
            keyLabel: "Enter",
            actionLabel: "执行搜索",
            description: "在搜索框中提交当前关键词。",
            enabled: true,
            disabledReason: null,
          },
        ],
      },
    ],
  };
}
