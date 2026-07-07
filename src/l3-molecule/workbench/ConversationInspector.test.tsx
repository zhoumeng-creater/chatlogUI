import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationInspector } from "./ConversationInspector";

describe("ConversationInspector", () => {
  it("renders context summary and a limited recommendation instead of repeated module entrances", () => {
    const html = renderToStaticMarkup(
      <ConversationInspector
        conversationTitle="Synthetic Chat"
        hasConversation
        stats={{
          loading: false,
          error: null,
          messageCount: 42,
          rangeLabel: "最近 7 天",
        }}
        privacyOn={false}
        onRetryStats={vi.fn()}
        onOpenAnalytics={vi.fn()}
      />,
    );

    expect(html).toContain("会话详情");
    expect(html).toContain("当前会话统计");
    expect(html).toContain("建议下一步");
    expect(html).toContain("查看完整统计");
    expect(html).not.toContain("搜索此会话");
    expect(html).not.toContain("打开媒体库");
    expect(html).not.toContain("问这个会话");
    expect(html).not.toContain("在图谱中查看");
    expect(html).not.toContain("媒体与扩展");
    expect(html).not.toContain("开发者工具");
  });

  it("shows a clear empty state when no conversation is selected", () => {
    const html = renderToStaticMarkup(
      <ConversationInspector
        conversationTitle="选择会话"
        hasConversation={false}
        stats={{
          loading: false,
          error: null,
          messageCount: null,
          rangeLabel: null,
        }}
        privacyOn={false}
        onRetryStats={vi.fn()}
        onOpenAnalytics={vi.fn()}
      />,
    );

    expect(html).toContain("选择会话后显示上下文");
  });

  it("shows the actual stats failure reason instead of a generic retry-only message", () => {
    const html = renderToStaticMarkup(
      <ConversationInspector
        conversationTitle="Synthetic Chat"
        hasConversation
        stats={{
          loading: false,
          error: "当前服务暂不支持统计接口。",
          messageCount: null,
          rangeLabel: null,
        }}
        privacyOn={false}
        onRetryStats={vi.fn()}
        onOpenAnalytics={vi.fn()}
      />,
    );

    expect(html).toContain("当前服务暂不支持统计接口。");
    expect(html).not.toContain("统计加载失败，请稍后重试。");
  });
});
