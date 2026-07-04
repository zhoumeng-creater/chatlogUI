import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SetupModeChooser } from "./SetupModeChooser";

describe("SetupModeChooser", () => {
  it("renders three task paths with project setup choice cards instead of demo utility colors", () => {
    const html = renderToStaticMarkup(
      <SetupModeChooser
        activePath="recommended-import"
        pathOptions={[
          {
            id: "recommended-import",
            label: "推荐自动导入",
            description: "选择微信数据目录，由应用管理本机服务。",
            selected: true,
          },
          {
            id: "external-service",
            label: "连接已有服务",
            description: "连接已经运行的本机聊天服务。",
            selected: false,
          },
          {
            id: "manual-advanced",
            label: "高级手动配置",
            description: "排障时手动填写服务配置。",
            selected: false,
          },
        ]}
        onChoosePath={vi.fn()}
      />,
    );

    expect(html).toContain("setup-choice-card");
    expect(html).toContain("推荐自动导入");
    expect(html).toContain("连接已有服务");
    expect(html).toContain("高级手动配置");
    expect(html).not.toContain("专家手动配置");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toMatch(/\b(bg|text|border)-(green|red|gray|blue)-/);
    expect(html).not.toContain("space-y-");
  });
});
