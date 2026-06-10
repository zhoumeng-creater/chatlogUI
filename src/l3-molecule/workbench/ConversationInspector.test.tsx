import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationInspector } from "./ConversationInspector";

describe("ConversationInspector", () => {
  it("renders context summary and scoped deep-link actions instead of full modules", () => {
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
        onOpenSearch={vi.fn()}
        onOpenAnalytics={vi.fn()}
        onOpenMedia={vi.fn()}
        onOpenAi={vi.fn()}
        onOpenGraph={vi.fn()}
      />,
    );

    expect(html).toContain("会话详情");
    expect(html).toContain("当前会话统计");
    expect(html).toContain("搜索此会话");
    expect(html).toContain("查看完整统计");
    expect(html).toContain("打开媒体库");
    expect(html).toContain("问这个会话");
    expect(html).toContain("在图谱中查看");
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
        onOpenSearch={vi.fn()}
        onOpenAnalytics={vi.fn()}
        onOpenMedia={vi.fn()}
        onOpenAi={vi.fn()}
        onOpenGraph={vi.fn()}
      />,
    );

    expect(html).toContain("选择会话后显示上下文");
  });
});
