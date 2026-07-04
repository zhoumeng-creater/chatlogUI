import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SetupActionPanel } from "./SetupActionPanel";

describe("SetupActionPanel", () => {
  it("puts the real setup action before secondary recovery actions", () => {
    const html = renderToStaticMarkup(
      <SetupActionPanel
        heading="先连接聊天数据"
        description="选择微信数据目录后，应用会启动本机服务并检查数据库。"
        primaryAction={{
          id: "choose-data-directory",
          label: "选择微信数据目录",
          variant: "primary",
          disabled: false,
        }}
        secondaryActions={[
          {
            id: "inspect-service-port",
            label: "检查端口",
            variant: "secondary",
            disabled: false,
          },
        ]}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="开始设置"');
    expect(html).toContain("setup-action-panel__primary");
    expect(html.indexOf("选择微信数据目录")).toBeLessThan(html.indexOf("检查端口"));
  });

  it("keeps helper text and loading state attached to the primary action", () => {
    const html = renderToStaticMarkup(
      <SetupActionPanel
        heading="服务已连接"
        description="继续检查数据库后再进入工作台。"
        primaryAction={{
          id: "refresh-database",
          label: "刷新数据库状态",
          variant: "primary",
          disabled: false,
          busy: true,
          helperText: "服务已连接，数据库尚未就绪。",
        }}
        secondaryActions={[]}
        onAction={vi.fn()}
      />,
    );

    expect(html).toContain("服务已连接，数据库尚未就绪。");
    expect(html).toContain("刷新数据库状态");
    expect(html).toContain("disabled");
  });
});
