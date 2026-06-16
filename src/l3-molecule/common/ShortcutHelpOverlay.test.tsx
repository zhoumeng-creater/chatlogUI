import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import overlaySource from "./ShortcutHelpOverlay.tsx?raw";
import { ShortcutHelpOverlay } from "./ShortcutHelpOverlay";
import type { ShortcutHelpCatalog } from "@l2/commander/shortcutCatalog";

describe("ShortcutHelpOverlay", () => {
  it("renders contextual shortcut groups as a modal without private text", () => {
    const html = renderToStaticMarkup(
      <ShortcutHelpOverlay
        catalog={catalog()}
        open
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("搜索快捷键");
    expect(html).toContain("执行搜索");
    expect(html).toContain("Ctrl / ⌘ + /");
    expect(html).not.toContain("Synthetic Private Query");
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
    title: "搜索快捷键",
    description: "只显示当前页面可用的快捷键。",
    groups: [
      {
        id: "global",
        label: "全局",
        shortcuts: [
          {
            id: "help",
            keyLabel: "?",
            alternativeKeyLabel: "Ctrl / ⌘ + /",
            actionLabel: "打开快捷键帮助",
            description: "显示当前页面快捷键。",
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
