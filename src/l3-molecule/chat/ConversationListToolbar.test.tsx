import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationListToolbar } from "./ConversationListToolbar";

describe("ConversationListToolbar", () => {
  it("renders category dots before conversation filter labels", () => {
    const html = renderToStaticMarkup(
      <ConversationListToolbar
        query=""
        filter="all"
        filterOptions={[
          { value: "all", label: "全部", count: 3, dotTone: "all" },
          { value: "private", label: "私聊", count: 1, dotTone: "private" },
          { value: "group", label: "群聊", count: 2, dotTone: "group" },
        ]}
        sortState={{ label: "按最近消息排序", disabledReason: null }}
        onQueryChange={vi.fn()}
        onFilterChange={vi.fn()}
        onClearQuery={vi.fn()}
      />,
    );

    expect(html).toContain("conversation-list__filter-dot");
    expect(html).toContain('data-tone="private"');
    expect(html.indexOf("conversation-list__filter-dot")).toBeLessThan(html.indexOf("私聊"));
  });
});
