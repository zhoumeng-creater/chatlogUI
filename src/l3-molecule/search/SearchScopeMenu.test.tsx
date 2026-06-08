import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchScopeMenu } from "./SearchScopeMenu";

describe("SearchScopeMenu", () => {
  it("explains why current-conversation scope is unavailable", () => {
    const html = renderToStaticMarkup(
      <SearchScopeMenu
        scope="all"
        currentConversationName=""
        currentConversationAvailable={false}
        onChange={vi.fn()}
      />,
    );

    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
    expect(html).toContain("ui-disabled-reason--compact");
    expect(html).toContain("先选择一个会话");
    expect(html).toContain("选择会话后可搜索当前会话");
  });
});
