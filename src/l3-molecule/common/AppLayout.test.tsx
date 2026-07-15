import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  it("provides a keyboard skip link to a focusable main region", () => {
    const html = renderToStaticMarkup(
      <AppLayout
        shell={{
          productName: "chatlogUI",
          title: "工作台",
          privacyOn: true,
          developerConsoleAction: null,
          windowControls: {
            minimizeLabel: "最小化",
            toggleMaximizeLabel: "最大化",
            closeLabel: "关闭",
            isMaximized: false,
          },
        }}
        actions={{
          togglePrivacy: vi.fn(),
          openSettings: vi.fn(),
          minimizeWindow: vi.fn(),
          toggleMaximizeWindow: vi.fn(),
          closeWindow: vi.fn(),
        }}
      >
        <div>主内容</div>
      </AppLayout>,
    );

    expect(html).toContain('href="#app-main"');
    expect(html).toContain("跳到主内容");
    expect(html).toContain('<main id="app-main"');
    expect(html).toContain('tabindex="-1"');
  });

  it("shows a privacy-safe recovery alert when native export cleanup defers close", () => {
    const html = renderToStaticMarkup(
      <AppLayout
        shell={{
          productName: "chatlogUI",
          title: "工作台",
          privacyOn: true,
          exportCleanupNotice: "导出文件仍在安全清理中。请关闭占用文件后再次关闭应用。",
          developerConsoleAction: null,
          windowControls: {
            minimizeLabel: "最小化",
            toggleMaximizeLabel: "最大化",
            closeLabel: "关闭",
            isMaximized: false,
          },
        }}
        actions={{
          togglePrivacy: vi.fn(),
          openSettings: vi.fn(),
          minimizeWindow: vi.fn(),
          toggleMaximizeWindow: vi.fn(),
          closeWindow: vi.fn(),
        }}
      >
        <div>主内容</div>
      </AppLayout>,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("导出文件仍在安全清理中");
    expect(html).not.toMatch(/Users|Synthetic|private-export/i);
  });
});
