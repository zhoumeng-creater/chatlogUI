import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AIModelSettings } from "./AIModelSettings";

describe("AIModelSettings", () => {
  it("renders semantic ownership summary instead of editable provider/model endpoint fields", () => {
    const html = renderToStaticMarkup(
      <AIModelSettings
        view={{
          title: "AI 与语义",
          statusLabel: "需要配置",
          statusTone: "warning",
          description: "语义搜索和问答配置由 AI 工作台负责。",
          indexLabel: "索引未检查",
          primaryAction: {
            label: "前往 AI 工作台配置",
            target: "/ai?source=settings&panel=semantic",
          },
          legacyIgnored: true,
        }}
        onOpenSemanticSettings={vi.fn()}
      />,
    );

    expect(html).toContain("AI 与语义");
    expect(html).toContain("前往 AI 工作台配置");
    expect(html).toContain("语义搜索和问答配置由 AI 工作台负责");
    expect(html).not.toContain("模型提供商");
    expect(html).not.toContain("API 端点");
    expect(html).not.toContain("模型名称");
    expect(html).not.toContain("settings-ai-endpoint");
    expect(html).not.toContain("https://synthetic-secret.example");
  });
});
