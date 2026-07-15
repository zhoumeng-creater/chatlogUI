import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  focusFirstSearchToolbarMenuItem,
  resolveMenuFocusIndex,
  resolveSearchToolbarInputModality,
  SearchBrowseToolbar,
} from "./SearchBrowseToolbar";

describe("SearchBrowseToolbar", () => {
  it("describes only applied facts and makes local organization limits explicit", () => {
    const html = renderToStaticMarkup(
      <SearchBrowseToolbar
        appliedQuery="synthetic invoice"
        appliedScopeLabel="全部会话"
        loadedCount={75}
        totalCount={132}
        exactTotal
        completeScope
        browseMode="manual"
        sortMode="newest"
        groupingMode="conversation"
        currentPageStart={0}
        currentPageCount={50}
        privacyOn={false}
        exportDisabled={false}
        openMenu="browse"
        onBrowseModeChange={vi.fn()}
        onSortModeChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
        onOpenExport={vi.fn()}
        onEndSearch={vi.fn()}
      />,
    );

    expect(html).toContain('“synthetic invoice”的搜索结果');
    expect(html).toContain("已在全部会话中检索");
    expect(html).toContain("已加载 75 / 共 132");
    expect(html).toContain("仅整理已加载结果");
    expect(html).toContain("手动加载");
    expect(html).toContain("手动加载");
    expect(html).toContain("接近边界时自动加载");
    expect(html).toContain("导出搜索结果");
    expect(html).toContain("更多结果操作");
  });

  it("keeps counts but removes raw applied facts from privacy DOM and labels paged windows", () => {
    const html = renderToStaticMarkup(
      <SearchBrowseToolbar
        appliedQuery="PRIVATE keyword"
        appliedScopeLabel="PRIVATE conversation"
        loadedCount={50}
        totalCount={132}
        exactTotal
        completeScope
        browseMode="paged"
        sortMode="baseline"
        groupingMode="none"
        currentPageStart={50}
        currentPageCount={50}
        privacyOn
        exportDisabled
        openMenu="group"
        exportDisabledReason="隐私模式下不可导出。"
        onBrowseModeChange={vi.fn()}
        onSortModeChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
        onOpenExport={vi.fn()}
      />,
    );

    expect(html).not.toContain("PRIVATE keyword");
    expect(html).not.toContain("PRIVATE conversation");
    expect(html).toContain("第 51–100 条");
    expect(html).toContain("已加载 50 / 共 132");
    expect(html).toContain("隐私模式下不可导出。");
    expect(html).toContain("按会话分组");
  });

  it("keeps ending the stable search behind one explicit result command", () => {
    const html = renderToStaticMarkup(
      <SearchBrowseToolbar
        appliedQuery="invoice"
        appliedScopeLabel="全部会话"
        loadedCount={50}
        totalCount={50}
        exactTotal
        completeScope
        browseMode="manual"
        sortMode="newest"
        groupingMode="none"
        currentPageStart={0}
        currentPageCount={50}
        privacyOn={false}
        exportDisabled={false}
        openMenu="more"
        onBrowseModeChange={vi.fn()}
        onSortModeChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
        onOpenExport={vi.fn()}
        onEndSearch={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="搜索结果工具栏"');
    expect(html).toContain('aria-label="更多结果操作"');
    expect(html).not.toContain('class="visually-hidden"');
    expect(html).toContain('role="menu"');
    expect(html).toContain("结束当前搜索");
  });

  it("cycles menu focus without leaving the active menu", () => {
    expect(resolveMenuFocusIndex("ArrowDown", 2, 3)).toBe(0);
    expect(resolveMenuFocusIndex("ArrowUp", 0, 3)).toBe(2);
    expect(resolveMenuFocusIndex("Home", 2, 3)).toBe(0);
    expect(resolveMenuFocusIndex("End", 0, 3)).toBe(2);
    expect(resolveMenuFocusIndex("Enter", 0, 3)).toBeNull();
  });

  it("focuses the first enabled menu item as soon as the menu is mounted", () => {
    const focus = vi.fn();
    const querySelector = vi.fn(() => ({ focus }));

    expect(
      focusFirstSearchToolbarMenuItem({ querySelector } as unknown as HTMLDivElement),
    ).toBe(true);
    expect(querySelector).toHaveBeenCalledWith("button:not(:disabled)");
    expect(focus).toHaveBeenCalledOnce();
  });

  it("distinguishes keyboard activation from pointer activation", () => {
    expect(resolveSearchToolbarInputModality(0)).toBe("keyboard");
    expect(resolveSearchToolbarInputModality(1)).toBe("pointer");
    expect(resolveSearchToolbarInputModality(2)).toBe("pointer");
  });

  it("does not start a conflicting refresh while a replacement is pending", () => {
    const html = renderToStaticMarkup(
      <SearchBrowseToolbar
        appliedQuery="invoice"
        appliedScopeLabel="全部会话"
        loadedCount={0}
        totalCount={0}
        exactTotal
        completeScope
        browseMode="manual"
        sortMode="baseline"
        groupingMode="none"
        currentPageStart={0}
        currentPageCount={0}
        privacyOn={false}
        exportDisabled={false}
        pendingReplacement
        stale
        onBrowseModeChange={vi.fn()}
        onSortModeChange={vi.fn()}
        onGroupingModeChange={vi.fn()}
        onOpenExport={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    expect(html).toContain("等待新搜索结束后刷新");
    expect(html).toContain('disabled=""');
  });
});
