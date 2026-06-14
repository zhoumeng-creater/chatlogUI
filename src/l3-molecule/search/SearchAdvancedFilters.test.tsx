import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchAdvancedFiltersState } from "@l2/commander/searchAdvancedFilters";
import { SearchAdvancedFilters } from "./SearchAdvancedFilters";

const defaultFilters: SearchAdvancedFiltersState = {
  dateRange: null,
  selectedChats: [],
  sender: "",
  favoriteOnly: false,
  attachmentOnly: false,
  sortMode: "time-desc",
  groupMode: "flat",
};

describe("SearchAdvancedFilters", () => {
  it("renders backend-supported date filters and disabled unsupported filters", () => {
    const html = renderToStaticMarkup(
      <SearchAdvancedFilters
        filters={defaultFilters}
        onChange={vi.fn()}
      />,
    );

    expect(html).toContain("高级筛选");
    expect(html).toContain("开始日期");
    expect(html).toContain("结束日期");
    expect(html).toContain("发送者筛选需要后端支持");
    expect(html).toContain("收藏筛选需要后端支持");
    expect(html).toContain("附件筛选需要后端支持");
  });
});
